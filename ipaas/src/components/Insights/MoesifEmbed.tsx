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

import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@wso2/oxygen-ui';
import { fetchMoesifViewerToken } from '../../api/moesif';
import { moesifInsightsUrl } from '../../paths';
import * as styles from './MoesifEmbed.styles';

export const HANDSHAKE_TIMEOUT_MS = 120_000;
export const TOKEN_REFRESH_MS = 50 * 60 * 1000;

/** Remounted by the page on org changes or retry; tokens never survive that boundary. */
export default function MoesifEmbed({ origin, apiBase, onRetry }: { origin: string; apiBase: string; onRetry: () => void }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const sendToken = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let token: string | null = null;
    let refreshing = false;
    let sent = false;
    let requestTimeout: number | undefined;

    const stop = () => {
      active = false;
      token = null;
      controller.abort();
      window.clearInterval(retryTimer);
      window.clearInterval(refreshTimer);
      window.clearTimeout(timeout);
      window.clearTimeout(requestTimeout);
    };
    const fail = (message: string) => {
      if (!active) return;
      stop();
      setReady(false);
      setError(message);
    };
    const send = () => {
      if (!active || !token || !iframe.current?.contentWindow) return;
      iframe.current.contentWindow.postMessage({ type: 'SET_TOKEN', token }, origin);
      sent = true;
    };
    sendToken.current = send;
    const mint = async () => {
      if (!active || refreshing) return;
      refreshing = true;
      // Bound refresh requests as well as the initial handshake.
      requestTimeout = window.setTimeout(() => fail('API Insights took too long to respond. Please try again.'), HANDSHAKE_TIMEOUT_MS);
      try {
        const nextToken = await fetchMoesifViewerToken(apiBase, controller.signal);
        if (!active) return;
        token = nextToken;
        send();
      } catch (cause) {
        if (active) fail(cause instanceof Error ? cause.message : 'Unable to load API Insights.');
      } finally {
        refreshing = false;
        window.clearTimeout(requestTimeout);
      }
    };
    const receive = (event: MessageEvent) => {
      if (!active || event.origin !== origin || event.source !== iframe.current?.contentWindow) return;
      const type = event.data?.type;
      if (sent && (type === 'ORG_LOAD_FINISHED' || type === 'SCHEMA_GEN_FINISHED')) {
        setReady(true);
        window.clearInterval(retryTimer);
        window.clearTimeout(timeout);
      } else if (type === 'REFRESH_TOKEN') {
        void mint();
      }
    };
    window.addEventListener('message', receive);
    const retryTimer = window.setInterval(send, 400);
    const refreshTimer = window.setInterval(() => void mint(), TOKEN_REFRESH_MS);
    const timeout = window.setTimeout(() => fail('API Insights did not finish loading. Please try again.'), HANDSHAKE_TIMEOUT_MS);
    void mint();
    return () => {
      stop();
      sendToken.current = () => {};
      window.removeEventListener('message', receive);
    };
  }, [origin, apiBase]);

  if (error)
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={onRetry}>
            Retry
          </Button>
        }>
        {error}
      </Alert>
    );
  return (
    <Box sx={styles.container}>
      {!ready && (
        <Box role="status" sx={styles.loading}>
          <CircularProgress size={24} />
          <Typography>Loading API Insights…</Typography>
        </Box>
      )}
      <iframe
        ref={iframe}
        src={moesifInsightsUrl(origin)}
        title="API Insights powered by Moesif"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        onLoad={() => sendToken.current()}
        style={{ ...styles.frame, display: ready ? 'block' : 'none' }}
      />
    </Box>
  );
}
