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

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PromoteButton from './PromoteButton';

const deployments: Record<string, { releaseId: string; build: { buildId: string } } | undefined> = {};
vi.mock('../../hooks/useDeployments', () => ({
  useComponentDeployment: (_o: string, _u: string, _c: string, _v: string, env: string) => ({ data: deployments[env], isLoading: false }),
  usePromote: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../hooks/useOrgUuid', () => ({ useOrgUuid: () => 'org' }));
vi.mock('../Authorized', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@wso2/oxygen-ui', () => ({
  Tooltip: ({ children, title }: { children: ReactNode; title: string }) => <div title={title}>{children}</div>,
  Button: ({ children, disabled }: { children: ReactNode; disabled: boolean }) => <button disabled={disabled}>{children}</button>,
}));
vi.mock('@wso2/oxygen-ui-icons-react', () => ({ ArrowDown: () => <span /> }));

let container: HTMLDivElement;
let root: Root;
const render = () => act(async () => root.render(<PromoteButton orgHandler="acme" componentId="sftask" versionId="v" deploymentPipelineId="p" sourceEnvId="development" targetEnvId="production" />));
const button = () => container.querySelector('button')!;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('PromoteButton', () => {
  it('offers a release of the build the target already runs', async () => {
    deployments.development = { releaseId: 'sftask-784445f4b4', build: { buildId: 'b1' } };
    deployments.production = { releaseId: 'sftask-66d97f5f4d', build: { buildId: 'b1' } };
    await render();
    expect(button().disabled).toBe(false);
  });

  it('holds back the release the target already runs', async () => {
    deployments.development = { releaseId: 'sftask-784445f4b4', build: { buildId: 'b1' } };
    deployments.production = { releaseId: 'sftask-784445f4b4', build: { buildId: 'b1' } };
    await render();
    expect(button().disabled).toBe(true);
    expect(container.querySelector('[title]')!.getAttribute('title')).toBe('Already deployed in target environment');
  });
});
