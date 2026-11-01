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

import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCreateComponent } from './useComponents';
import { createComponent } from '../api/components';
import { fetchEnvironments } from '../api/environments';
import { renderWithScopes } from '../test/renderWithScopes';
import { DEVELOPER, PLATFORM_ENGINEER } from '../test/roles';
import type { CreateComponentInput } from '../types/component';

vi.mock('../api/components', () => ({ createComponent: vi.fn().mockResolvedValue({}) }));
vi.mock('../api/environments', () => ({ fetchEnvironments: vi.fn() }));
vi.mock('../services/tracking/tracking', () => ({ trackEvent: () => {} }));

const firstEnvironment = (critical: boolean) => vi.mocked(fetchEnvironments).mockResolvedValue([{ id: 'first', name: 'First', critical }]);
const input = { projectId: 'uiprod', name: 'orders' } as CreateComponentInput;

let create: () => Promise<unknown> = async () => {};
function Create() {
  const { mutateAsync } = useCreateComponent();
  create = () => mutateAsync(input);
  return null;
}
let unmount = () => {};
afterEach(() => {
  unmount();
  vi.mocked(createComponent).mockClear();
});

async function createAs(scopes: string[]) {
  const r = await renderWithScopes(<Create />, scopes);
  unmount = r.unmount;
  await act(() => create());
  return vi.mocked(createComponent).mock.calls[0][0];
}

describe('useCreateComponent', () => {
  it('creates without auto-deploy for a Developer when the pipeline starts in production', async () => {
    firstEnvironment(true);
    expect((await createAs(DEVELOPER)).enableAutoDeploy).toBe(false);
  });

  it("keeps a Developer's auto-deploy when the pipeline starts in development", async () => {
    firstEnvironment(false);
    expect((await createAs(DEVELOPER)).enableAutoDeploy).toBeUndefined();
  });

  it('keeps auto-deploy for a role with production-write', async () => {
    firstEnvironment(true);
    expect((await createAs(PLATFORM_ENGINEER)).enableAutoDeploy).toBeUndefined();
  });
});
