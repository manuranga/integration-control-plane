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

import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchOrgComponentLimits, fetchOrgSubscriptions, fetchOrgs, fetchProjectsByOrgId, registerUser, validateOrgName } from '#api/org';

export function useOrgs() {
  return useQuery({
    queryKey: ['orgs'],
    queryFn: fetchOrgs,
    staleTime: 5 * 60 * 1000,
  });
}

export function useOrgComponentLimits(orgUuid: string) {
  return useQuery({
    queryKey: ['orgComponentLimits', orgUuid],
    queryFn: () => fetchOrgComponentLimits(orgUuid),
    enabled: !!orgUuid,
    staleTime: 30 * 1000,
  });
}

export function useOrgSubscriptions(orgUuid: string) {
  return useQuery({
    queryKey: ['orgSubscriptions', orgUuid],
    queryFn: () => fetchOrgSubscriptions(orgUuid),
    enabled: !!orgUuid,
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
}

export function useProjectsByOrgId(orgNumericId: number, enabled = true) {
  return useQuery({
    queryKey: ['projects-by-org', orgNumericId],
    queryFn: () => fetchProjectsByOrgId(orgNumericId),
    enabled: enabled && orgNumericId > 0,
  });
}

export function useValidateOrgName() {
  return useMutation({
    mutationFn: (orgName: string) => validateOrgName(orgName),
  });
}

export function useRegisterUser() {
  return useMutation({
    mutationFn: ({ orgName, termsAccepted, serviceName }: { orgName: string; termsAccepted: boolean; serviceName: string }) => registerUser(orgName, termsAccepted, serviceName),
  });
}
