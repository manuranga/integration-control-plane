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

import { useAccessControl } from '../contexts/AccessControlContext';
import { Scopes } from '../constants/permissions';
import { scopesIn } from '../utils/permissions';

/** Whether the user's role allows an action that needs `scope`, in `environment` when it acts on one. */
export function useCan(): (scope: string, environment?: { critical: boolean }) => boolean {
  const { hasAllPermissions } = useAccessControl();
  return (scope, environment) => hasAllPermissions(environment ? scopesIn(scope, environment) : [scope]);
}

/** Whether the user's role may read pod logs in `environment`: production logs need their own scope. */
export function useCanReadLogs(): (environment?: { critical: boolean }) => boolean {
  const { hasAllPermissions } = useAccessControl();
  return (environment) => hasAllPermissions(environment?.critical ? [Scopes.LOG_READ, Scopes.LOG_PRODUCTION_READ] : [Scopes.LOG_READ]);
}
