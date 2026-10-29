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

import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCertificateGroups,
  fetchConfigGroups,
  fetchCertificateMappings,
  fetchSchemaConfig,
  fetchConfigMgt,
  saveSchemaConfig,
  postConfigMgt,
  postCertificateMappings,
  fetchResourceLinks,
  fetchResourceLinkSuggestions,
  createResourceLink,
  refreshResourceLinks,
  connectResourceLink,
} from '../api/configuration';
import type { CertMapping, SchemaConfigItem, SaveSchemaConfigInput, PostConfigMgtInput, CreateResourceLinkInput, ConnectResourceLinkInput, ResourceLink } from '../types/configuration';
import type { ComponentDeployment } from '../types/deployment';

export function useCertificateGroups(projectId: string, componentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['certGroups', projectId, componentId],
    queryFn: () => fetchCertificateGroups(projectId, componentId),
    enabled: enabled && !!projectId && !!componentId,
    retry: false,
  });
}

export function useConfigGroups(projectId: string, componentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['configGroups', projectId, componentId],
    queryFn: () => fetchConfigGroups(projectId, componentId),
    enabled: enabled && !!projectId && !!componentId,
    retry: false,
  });
}

export function useCertificateMappings(projectId: string, componentId: string, envId: string, deploymentTrackId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['certMappings', projectId, componentId, envId, deploymentTrackId],
    queryFn: () => fetchCertificateMappings(projectId, componentId, envId, deploymentTrackId),
    enabled: enabled && !!projectId && !!componentId && !!envId && !!deploymentTrackId,
    retry: false,
  });
}

export function useSchemaConfig(projectId: string, componentId: string, envId: string, deploymentTrackId: string, commitHash?: string, enabled = true) {
  return useQuery({
    queryKey: ['schemaConfig', projectId, componentId, envId, deploymentTrackId, commitHash],
    queryFn: () => fetchSchemaConfig(projectId, componentId, envId, deploymentTrackId, commitHash),
    // Don't wait for commitHash: a deploy that fails before producing a commit still has a schema to show.
    enabled: enabled && !!projectId && !!componentId && !!envId && !!deploymentTrackId,
    retry: false,
  });
}

export function useGetConfigMgt(orgHandler: string, projectId: string, componentId: string, envId: string, versionId: string, componentName: string, commitHash?: string, drawerOpen = false) {
  return useQuery({
    queryKey: ['configMgt', orgHandler, projectId, componentId, envId, versionId, commitHash],
    queryFn: () => fetchConfigMgt(orgHandler, projectId, componentId, envId, versionId, componentName, commitHash),
    enabled: drawerOpen && !!orgHandler && !!projectId && !!componentId && !!envId && !!versionId && !!componentName,
    retry: false,
  });
}

export function useSaveSchemaConfig() {
  const qc = useQueryClient();
  return useMutation<{ configurations: SchemaConfigItem[] }, unknown, SaveSchemaConfigInput>({
    mutationFn: saveSchemaConfig,
    onSuccess: (data, vars) => {
      if (data && data.configurations) {
        qc.setQueryData(['schemaConfig', vars.projectId, vars.componentId, vars.envId, vars.deploymentTrackId, vars.commitHash], data);
      }
      qc.invalidateQueries({ queryKey: ['schemaConfig', vars.projectId, vars.componentId, vars.envId, vars.deploymentTrackId] });
      // Saving config redeploys the integration; the whole prefix goes since the key carries org and version.
      qc.invalidateQueries({ queryKey: ['componentDeployment'] });
    },
  });
}

export function usePostConfigMgt() {
  const qc = useQueryClient();
  return useMutation<unknown, unknown, PostConfigMgtInput>({
    mutationFn: postConfigMgt,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['configMgt', vars.orgHandler, vars.projectId, vars.componentId, vars.envId, vars.versionId] });
    },
  });
}

export function usePostCertificateMappings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CertMapping) => postCertificateMappings(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['certMappings', vars.projectId, vars.componentId, vars.envTemplateId, vars.deploymentTrackId] });
    },
  });
}

export function useResourceLinks(projectId: string, componentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['resourceLinks', projectId, componentId],
    queryFn: () => fetchResourceLinks(projectId, componentId),
    enabled: enabled && !!projectId && !!componentId,
    retry: false,
  });
}

export function useResourceLinkSuggestions(projectId: string, componentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['resourceLinkSuggestions', projectId, componentId],
    queryFn: () => fetchResourceLinkSuggestions(projectId, componentId),
    enabled: enabled && !!projectId && !!componentId,
    retry: false,
  });
}

export function useCreateResourceLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateResourceLinkInput) => createResourceLink(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['resourceLinks', vars.projectId, vars.componentId] });
      // Linking rolls the integration out in every environment.
      qc.invalidateQueries({ queryKey: ['componentDeployment'] });
    },
  });
}

/**
 * While enabled, reloads the integration's links when the deployment of one of its environments changes, as the
 * environment cards poll it: a link written elsewhere (a refresh from another page, a link made on WSO2 Cloud) rolls the
 * integration out.
 */
export function useReloadLinksOnDeploymentChange(projectId: string, componentId: string, enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const cache = qc.getQueryCache();
    const ofComponent = (key: readonly unknown[]) => key[0] === 'componentDeployment' && key.includes(componentId);
    const state = (data: ComponentDeployment | null | undefined) => `${data?.releaseId}/${data?.deploymentStatusV2}`;
    const seen = new Map(cache.findAll({ predicate: (q) => ofComponent(q.queryKey) && q.state.data !== undefined }).map((q) => [q.queryHash, state(q.state.data as ComponentDeployment | null)]));
    return cache.subscribe((e) => {
      if (e.type !== 'updated' || !ofComponent(e.query.queryKey) || e.query.state.data === undefined) return;
      const now = state(e.query.state.data as ComponentDeployment | null);
      const before = seen.get(e.query.queryHash);
      seen.set(e.query.queryHash, now);
      if (before !== undefined && before !== now) void qc.invalidateQueries({ queryKey: ['resourceLinks', projectId, componentId] });
    });
  }, [qc, projectId, componentId, enabled]);
}

/** Connects a link that supplies no configurable through one of its connections. */
export function useConnectResourceLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ConnectResourceLinkInput) => connectResourceLink(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['resourceLinks', vars.projectId, vars.componentId] });
      qc.invalidateQueries({ queryKey: ['componentDeployment'] });
    },
  });
}

/**
 * Brings the integration's links up to its latest build (the BFF follows a build once every
 * environment runs it). Call it when the Configure form opens, when a build finishes and when an
 * environment's deployed release changes.
 */
export function useRefreshResourceLinks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, componentId }: { projectId: string; componentId: string }) => refreshResourceLinks(projectId, componentId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['resourceLinks', vars.projectId, vars.componentId] });
    },
  });
}

const noLinks: ResourceLink[] = [];

/**
 * The links of an open Configure form, refreshed as it opens, and the configurables they supply
 * (config key → resource type).
 */
export function useFormLinks(projectId: string, componentId: string, open: boolean) {
  const { data: links = noLinks } = useResourceLinks(projectId, componentId, open);
  const { mutate: refreshLinks } = useRefreshResourceLinks();
  useEffect(() => {
    if (open && projectId && componentId) refreshLinks({ projectId, componentId });
  }, [open, projectId, componentId, refreshLinks]);
  useReloadLinksOnDeploymentChange(projectId, componentId, open);
  const linkedFrom = useMemo(() => linkedConfigurables(links), [links]);
  return { links, linkedFrom };
}

/** Config key → the resource type whose link supplies the configurable. */
export const linkedConfigurables = (links: ResourceLink[]): Map<string, string> => new Map(links.flatMap((l) => Object.keys(l.configurables).map((key) => [key, l.resourceType] as const)));
