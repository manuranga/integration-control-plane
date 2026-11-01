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

import { afterEach, describe, expect, it, vi } from 'vitest';
import DeleteIntegrationButton from './DeleteIntegrationButton';
import { Scopes } from '../constants/permissions';
import { PRODUCTION_REFUSAL } from '../hooks/useCan';
import { fetchReleaseMgtDeployments } from '../api/deployments';
import { button, flush, reasonFor, renderWithScopes } from '../test/renderWithScopes';
import type { Component } from '../types/component';

vi.mock('../api/environments', () => ({
  fetchAllEnvironments: () =>
    Promise.resolve([
      { id: 'development', name: 'Development', critical: false },
      { id: 'production', name: 'Production', critical: true },
    ]),
}));
vi.mock('../api/deployments', () => ({ fetchReleaseMgtDeployments: vi.fn() }));

const deployedIn = (...environmentIds: string[]) => vi.mocked(fetchReleaseMgtDeployments).mockResolvedValue(environmentIds.map((environmentId) => ({ environmentId }) as never));
const component = { id: 'orders', displayName: 'Orders' } as Component;
const DEVELOPER = [Scopes.INTEGRATION_DELETE];
let unmount = () => {};
afterEach(() => unmount());

async function deleteButton(scopes: string[]) {
  const r = await renderWithScopes(<DeleteIntegrationButton component={component} onClick={() => {}} />, scopes);
  unmount = r.unmount;
  await flush();
  return button(r.container, 'Delete Orders');
}

describe('DeleteIntegrationButton', () => {
  it('refuses a Developer when the integration runs in production, with the reason', async () => {
    deployedIn('development', 'production');
    const b = await deleteButton(DEVELOPER);
    expect(b?.disabled).toBe(true);
    expect(reasonFor(b)).toBe(PRODUCTION_REFUSAL);
  });

  it('lets a Developer delete an integration that runs only in development', async () => {
    deployedIn('development');
    expect((await deleteButton(DEVELOPER))?.disabled).toBe(false);
  });

  it('lets a role with production-write delete an integration that runs in production', async () => {
    deployedIn('production');
    expect((await deleteButton([...DEVELOPER, Scopes.PRODUCTION_WRITE]))?.disabled).toBe(false);
  });
});
