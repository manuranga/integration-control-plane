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
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { useReloadLinksOnDeploymentChange } from './useConfiguration';

const key = (componentId: string, env: string) => ['componentDeployment', 'acme', 'org-uuid', componentId, 'track', env];
const deployment = (releaseId: string, status: string) => ({ releaseId, deploymentStatusV2: status, cron: '', cronTimezone: '' });

let container: HTMLDivElement;
let root: Root;
let qc: QueryClient;
let invalidate: MockInstance<QueryClient['invalidateQueries']>;

function Probe({ enabled }: { enabled: boolean }) {
  useReloadLinksOnDeploymentChange('default', 'sfdemo', enabled);
  return null;
}
const mount = (enabled = true) =>
  act(async () =>
    root.render(
      <QueryClientProvider client={qc}>
        <Probe enabled={enabled} />
      </QueryClientProvider>,
    ),
  );
const set = (componentId: string, env: string, data: ReturnType<typeof deployment>) => act(async () => void qc.setQueryData(key(componentId, env), data));
const linkReloads = () => invalidate.mock.calls.filter(([f]) => JSON.stringify(f?.queryKey) === JSON.stringify(['resourceLinks', 'default', 'sfdemo'])).length;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  qc = new QueryClient();
  qc.setQueryData(key('sfdemo', 'development'), deployment('r1', 'ACTIVE'));
  invalidate = vi.spyOn(qc, 'invalidateQueries');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('useReloadLinksOnDeploymentChange', () => {
  it("reloads the links when an environment's deployment changes", async () => {
    await mount();
    await set('sfdemo', 'development', deployment('r1', 'IN_PROGRESS'));
    expect(linkReloads()).toBe(1);
    await set('sfdemo', 'development', deployment('r1', 'ACTIVE'));
    expect(linkReloads()).toBe(2);
  });

  it('ignores a poll that finds the deployment as it was, and a first sight of an environment', async () => {
    await mount();
    await set('sfdemo', 'development', deployment('r1', 'ACTIVE'));
    await set('sfdemo', 'production', deployment('r1', 'ACTIVE'));
    expect(linkReloads()).toBe(0);
  });

  it("ignores other integrations' deployments", async () => {
    qc.setQueryData(key('other', 'development'), deployment('r1', 'ACTIVE'));
    await mount();
    await set('other', 'development', deployment('r2', 'IN_PROGRESS'));
    expect(linkReloads()).toBe(0);
  });

  it('does nothing while disabled (the drawer closed)', async () => {
    await mount(false);
    await set('sfdemo', 'development', deployment('r1', 'IN_PROGRESS'));
    expect(linkReloads()).toBe(0);
  });
});
