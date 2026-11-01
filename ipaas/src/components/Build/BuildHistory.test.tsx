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
import { MemoryRouter } from 'react-router';
import BuildHistory from './BuildHistory';
import { PRODUCTION_REFUSAL } from '../../hooks/useCan';
import { button, reasonFor, renderWithScopes } from '../../test/renderWithScopes';
import { DEVELOPER } from '../../test/roles';
import type { Commit, Repository } from '../../types/repository';

vi.mock('../../hooks/useDeployments', () => ({ useTriggerBuild: () => ({ mutate: vi.fn(), isPending: false }) }));
vi.mock('./BuildRightDrawer', () => ({ default: () => null }));

const commits = [{ sha: 'abc', message: 'm', isLatest: true, author: { name: '', email: '', date: '', avatarUrl: '' } }] as Commit[];
let unmount = () => {};
afterEach(() => unmount());

async function buildLatest(autoDeployCritical: boolean) {
  const r = await renderWithScopes(
    <MemoryRouter>
      <BuildHistory componentId="orders" versionId="v1" envId="production" branch="main" builds={[]} buildsLoading={false} commits={commits} commitsLoading={false} repository={{} as Repository} autoDeployCritical={autoDeployCritical} aiAgent={false} />
    </MemoryRouter>,
    DEVELOPER,
  );
  unmount = r.unmount;
  return button(r.container, 'Build Latest');
}

describe('BuildHistory', () => {
  it('refuses a Developer to build when the build auto-deploys to production, with the reason', async () => {
    const b = await buildLatest(true);
    expect(b?.disabled).toBe(true);
    expect(reasonFor(b)).toBe(PRODUCTION_REFUSAL);
  });

  it('lets a Developer build when the build deploys nowhere in production', async () => {
    expect((await buildLatest(false))?.disabled).toBe(false);
  });
});
