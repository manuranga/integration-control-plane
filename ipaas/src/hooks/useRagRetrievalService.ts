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

import { useEffect, useMemo, useState } from 'react';
import { useComponents, useComponentByHandler } from './useComponents';
import { useComponentDeployment, useEnvEndpoints } from './useDeployments';
import { useGenerateTestKey } from './useApim';
import { useOrgUuid } from './useOrgUuid';
import { RAG_RETRIEVAL_SERVICE_SUBTYPE } from '../constants/ragIngestion';

/**
 * Resolves the query target for a RAG ingestion's Retrieval tab: the sibling
 * `rag-retrieval-service` component's active endpoint for the current env, plus
 * a minted test key. The retrieval service resolves the vector-store + embedding
 * config server-side from the ingestion's component id, so the overview never
 * needs to read the (write-only) secrets. Mirrors devant's RAGChatWindow.
 */
export interface RagRetrievalTarget {
  /** No `rag-retrieval-service` component exists in the project yet. */
  serviceExists: boolean;
  /** Retrieval-service endpoint base URL — non-empty only when reachable. */
  invokeUrl: string;
  /** Minted test key for the `test-key` header — null until authenticated. */
  apiKey: string | null;
  /** Still resolving component/deployment/endpoint/auth. */
  isResolving: boolean;
  /** True when everything is ready to send a query. */
  canQuery: boolean;
  /** Human-readable reason the target isn't queryable (null when it is). */
  disabledReason: string | null;
}

export function useRagRetrievalService(orgHandler: string, projectId: string, envId: string, envCritical: boolean): RagRetrievalTarget {
  const orgUuid = useOrgUuid() ?? '';

  // 1. Find the sibling retrieval-service component in this project.
  const { data: components = [], isLoading: loadingComponents } = useComponents(orgHandler, projectId);
  const service = useMemo(() => components.find((c) => c.componentSubType === RAG_RETRIEVAL_SERVICE_SUBTYPE) ?? null, [components]);

  // 2. Its latest version (deployment track).
  const { data: serviceDetail, isLoading: loadingDetail } = useComponentByHandler(projectId, service?.handler);
  const versionId = useMemo(() => {
    const versions = serviceDetail?.apiVersions ?? [];
    return (versions.find((v) => v.latest) ?? versions[0])?.id ?? '';
  }, [serviceDetail]);

  // 3. Its deployment (releaseId + status) in the current env.
  const { data: deployment, isLoading: loadingDeployment } = useComponentDeployment(orgHandler, orgUuid, service?.id ?? '', versionId, envId);
  const releaseId = deployment?.releaseId ?? '';
  const deploymentActive = deployment?.deploymentStatusV2 === 'ACTIVE';

  // 4. Its endpoint (need publicUrl + apimId to authenticate).
  const { data: endpoints = [], isLoading: loadingEndpoints } = useEnvEndpoints(service?.id ?? '', versionId, envId, releaseId);
  const endpoint = useMemo(() => endpoints.find((e) => e.publicUrl && e.apimId) ?? null, [endpoints]);
  const invokeUrl = deploymentActive ? (endpoint?.publicUrl ?? '') : '';
  const apimId = endpoint?.apimId ?? null;

  // 5. Mint a test key for the endpoint's APIM API.
  const generateKey = useGenerateTestKey();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  useEffect(() => {
    if (!apimId) return;
    let cancelled = false;
    setAuthError(false);
    generateKey
      .mutateAsync({ apimId, keyType: envCritical ? 'Production' : 'Development' })
      .then((result) => {
        if (cancelled) return;
        setApiKey(result?.apikey ?? null);
        if (!result?.apikey) setAuthError(true);
      })
      .catch(() => {
        if (!cancelled) setAuthError(true);
      });
    // Ignore a stale request that resolves after apimId/envCritical changed.
    return () => {
      cancelled = true;
    };
    // generateKey is a stable mutation object; apimId/envCritical drive identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apimId, envCritical]);

  const isResolving = loadingComponents || (!!service && (loadingDetail || loadingDeployment || loadingEndpoints));
  const canQuery = !!invokeUrl && !!apiKey;

  let disabledReason: string | null = null;
  if (isResolving) disabledReason = 'Connecting to the retrieval service…';
  else if (!service) disabledReason = 'No RAG Retrieval Service found in this project. Create a RAG ingestion to provision one.';
  else if (!deploymentActive) disabledReason = 'The RAG Retrieval Service is not active in this environment yet.';
  else if (!invokeUrl) disabledReason = 'The RAG Retrieval Service has no reachable endpoint yet.';
  else if (authError) disabledReason = 'Could not authenticate with the retrieval service. Check your permissions and try again.';
  else if (!apiKey) disabledReason = 'Authenticating with the retrieval service…';

  return { serviceExists: !!service, invokeUrl, apiKey, isResolving, canQuery, disabledReason };
}
