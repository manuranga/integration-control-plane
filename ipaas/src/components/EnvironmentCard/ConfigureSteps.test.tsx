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
import { ManageEndpoint } from './ConfigureSteps';
import { Scopes } from '../../constants/permissions';
import { PRODUCTION_REFUSAL } from '../../hooks/useCan';
import { button, flush, reasonFor, renderWithScopes } from '../../test/renderWithScopes';
import type { EnvEndpoint } from '../../types/component';

vi.mock('../../api/environments', () => ({
  fetchAllEnvironments: () =>
    Promise.resolve([
      { id: 'development', name: 'Development', critical: false },
      { id: 'production', name: 'Production', critical: true },
    ]),
}));

const ep = { id: 'http', displayName: 'HTTP', networkVisibilities: ['Public'] } as EnvEndpoint;
let unmount = () => {};
afterEach(() => unmount());

async function update(environmentId: string, scopes: string[]) {
  const r = await renderWithScopes(<ManageEndpoint ep={ep} componentId="orders" projectId="default" versionId="v1" releaseId="orders-1" environmentId={environmentId} onBack={() => {}} />, scopes);
  unmount = r.unmount;
  await flush();
  return button(r.container, 'Update');
}

describe('ManageEndpoint visibility', () => {
  it("is refused in production without production-write, by that environment's own rule", async () => {
    const b = await update('production', [Scopes.ENDPOINT_EXPOSE]);
    expect(b?.disabled).toBe(true);
    expect(reasonFor(b)).toBe(PRODUCTION_REFUSAL);
  });

  it('is allowed in development', async () => {
    expect((await update('development', [Scopes.ENDPOINT_EXPOSE]))?.disabled).toBe(false);
  });

  it('is not offered without endpoint:expose', async () => {
    expect(await update('development', [Scopes.ENDPOINT_UPDATE])).toBeUndefined();
  });
});
