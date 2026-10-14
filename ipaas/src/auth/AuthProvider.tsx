/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { ThunderIDProvider, useThunderID } from '@thunderid/react';
import { hasAuthParamsInUrl, hasCalledForThisInstanceInUrl } from '@thunderid/browser';
import PageLoader from '../components/PageLoader';
import { oidcCallbackUrl } from '../paths';
import { editorSignInForwardUrl } from '../utils/vscodeCallback';
import type { AuthContextValue } from './types';
import { decodeJwtPayload, isExpired, stringClaim } from './jwt';
import { clearLegacySession } from './legacySession';
import { connect, disconnect, type CloudSession, type CloudUser } from './session';
import { THUNDER_INSTANCE_ID, signInParams, thunderConfig } from './thunderConfig';

const ORG_HANDLE_KEY = 'org_handle';
const MISSING_ORG = 'Missing organization context after sign-in. Please try logging in again.';
const SIGNED_OUT_USER: CloudUser = { userId: '', username: '', displayName: '' };
// How long a stored session may take to restore, including the SDK's startup refresh of an expired token.
const REFRESH_WAIT_MS = 5_000;
const RECHECK_MS = 250;

type Status = { kind: 'pending' } | { kind: 'signedIn'; session: CloudSession } | { kind: 'signedOut'; error: string | null };

const AuthContext = createContext<AuthContextValue | null>(null);

function isSignInLanding(): boolean {
  return window.location.pathname === oidcCallbackUrl();
}

/** The editor to forward this load's sign-in result to, before the SDK can act on the code. */
function editorForwardUrl(): string | null {
  if (!isSignInLanding()) return null;
  return editorSignInForwardUrl(new URLSearchParams(window.location.search), {
    origins: window.API_CONFIG?.editorCallbackOrigins ?? [],
    domains: window.API_CONFIG?.editorCallbackDomains ?? [],
  });
}

/** Whether the SDK will exchange a code on this load: one it asked for, returned to /signin. */
function sdkHasCode(): boolean {
  const { search } = window.location;
  return isSignInLanding() && hasAuthParamsInUrl(search) && hasCalledForThisInstanceInUrl(THUNDER_INSTANCE_ID, search);
}

/**
 * The org comes from the access token, which the backend reads too. The profile prefers the ID
 * token and falls back to the access token, which carries the same name and email claims — a
 * session seeded from an access token alone, as E2E token mode does, has no ID token.
 */
function toSession(accessToken: string, idClaims: Record<string, unknown> | null): CloudSession | null {
  const access = decodeJwtPayload(accessToken);
  const claim = (name: string): string | undefined => (idClaims ? stringClaim(idClaims, name) : undefined) ?? stringClaim(access, name);
  const orgHandle = stringClaim(access, 'ouHandle');
  const orgUuid = stringClaim(access, 'ouId');
  const userId = claim('sub');
  if (!orgHandle || !orgUuid || !userId) return null;

  const username = claim('username') ?? claim('preferred_username') ?? claim('email') ?? userId;
  return {
    user: {
      userId,
      username,
      displayName: claim('name') ?? claim('given_name') ?? username,
      pictureUrl: claim('picture'),
    },
    orgHandle,
    orgUuid,
  };
}

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [editorUrl] = useState(editorForwardUrl);
  const [config] = useState(thunderConfig);

  useEffect(() => {
    clearLegacySession();
  }, []);

  useEffect(() => {
    if (editorUrl) window.location.href = editorUrl;
  }, [editorUrl]);

  // The SDK never mounts for an editor's sign-in, so its code is forwarded untouched.
  if (editorUrl) return <PageLoader viewport label="Completing sign in…" />;

  return (
    <ThunderIDProvider {...config}>
      <CloudSessionProvider>{children}</CloudSessionProvider>
    </ThunderIDProvider>
  );
}

function CloudSessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const { isInitialized, isLoading, isSignedIn, getAccessToken, getDecodedIdToken, clearSession, signIn, signOut } = useThunderID();
  const [hasCode] = useState(sdkHasCode);
  const [status, setStatus] = useState<Status>({ kind: 'pending' });
  const [mountedAt] = useState(Date.now);
  const [recheck, setRecheck] = useState(0);

  const endSession = useCallback(
    (error: string | null) => {
      disconnect();
      clearSession();
      setStatus({ kind: 'signedOut', error });
    },
    [clearSession],
  );

  // Settles once, from the SDK's state. `isLoading` alone can't say signed out:
  // it drops between initialising and restoring a stored session.
  useEffect(() => {
    if (status.kind !== 'pending' || !isInitialized) return;
    // Still exchanging the code it was handed.
    if (hasCode && isLoading && !isSignedIn) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const settle = async (): Promise<void> => {
      const accessToken = await getAccessToken();
      if (cancelled) return;
      if (!accessToken) return setStatus({ kind: 'signedOut', error: null });
      // The SDK's isSignedIn means "holds an unexpired token", so a stored session it has not
      // confirmed is one it is still restoring — or refreshing, if the token expired. Neither
      // outlasts the wait: a refresh that has not landed by then (the refresh token expired too,
      // or there never was one) leaves nothing to restore.
      if (!isSignedIn || isExpired(accessToken)) {
        if (Date.now() - mountedAt < REFRESH_WAIT_MS) {
          timer = setTimeout(() => setRecheck((n) => n + 1), RECHECK_MS);
          return;
        }
        return endSession(null);
      }

      // The SDK throws rather than return nothing when the session holds no ID token.
      const idClaims = await getDecodedIdToken().then(
        (claims) => claims as Record<string, unknown>,
        () => null,
      );
      const session = toSession(accessToken, idClaims);
      if (cancelled) return;
      if (!session) return endSession(MISSING_ORG);

      connect({ session, getAccessToken, onExpired: () => endSession(null) });
      // Read by AppLayout and the post-login routing to know the active org.
      localStorage.setItem(ORG_HANDLE_KEY, session.orgHandle);
      setStatus({ kind: 'signedIn', session });
    };
    settle().catch(() => {
      if (!cancelled) endSession(null);
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status.kind, hasCode, isInitialized, isLoading, isSignedIn, recheck, mountedAt, getAccessToken, getDecodedIdToken, endSession]);

  const loginWithOIDC = useCallback(
    async (fidp?: string) => {
      await signIn(signInParams(fidp));
    },
    [signIn],
  );

  const completeSignIn = useCallback(
    async (params: URLSearchParams) => {
      const oidcError = params.get('error');
      if (oidcError) throw new Error(`Authentication failed: ${params.get('error_description') || oidcError}`);
      if (status.kind !== 'signedIn') throw new Error(status.kind === 'signedOut' && status.error ? status.error : 'Sign-in did not complete. Please try logging in again.');
      return { userId: status.session.user.userId, orgHandle: status.session.orgHandle };
    },
    [status],
  );

  const logout = useCallback(async () => {
    disconnect();
    localStorage.removeItem(ORG_HANDLE_KEY);
    // Clears the local session, then leaves for Thunder's end-session endpoint.
    await signOut();
    // Callers don't navigate over the redirect.
    return new Promise<void>(() => {});
  }, [signOut]);

  const value = useMemo<AuthContextValue>(() => {
    const user = status.kind === 'signedIn' ? status.session.user : SIGNED_OUT_USER;
    return {
      isAuthenticated: status.kind === 'signedIn',
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      pictureUrl: user.pictureUrl,
      orgHandle: status.kind === 'signedIn' ? status.session.orgHandle : '',
      loginWithOIDC,
      completeSignIn,
      logout,
    };
  }, [status, loginWithOIDC, completeSignIn, logout]);

  if (status.kind === 'pending') return <PageLoader viewport label={hasCode ? 'Completing sign in…' : undefined} />;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
