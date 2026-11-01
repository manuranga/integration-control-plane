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
import BuildArea from './BuildArea';
import { PRODUCTION_REFUSAL } from '../../hooks/useCan';
import { button, reasonFor, renderWithScopes } from '../../test/renderWithScopes';
import { DEVELOPER } from '../../test/roles';
import type { ComponentTypeFlags } from '../../utils/componentType';

const images = [{ imageId: 'img-1', commitHash: 'abc', commitMessage: 'm', createdAt: '', updatedAt: '', builtAt: '', runId: '1' }];
const noBuilds: never[] = [];
const idle = { mutate: vi.fn(), isPending: false };
vi.mock('../../hooks/useDeployments', () => ({
  useDeploymentStatus: () => ({ data: noBuilds }),
  useDeploymentTrackImages: () => ({ data: images, isLoading: false }),
  useComponentDeployment: () => ({ data: undefined }),
  useDeployDeploymentTrack: () => idle,
}));
vi.mock('../../hooks/useComponents', () => ({ useUpdateAutoDeployEnabled: () => idle }));
vi.mock('./BuildImageCard', () => ({ default: () => null }));
vi.mock('../EnvironmentCard/ConfigureDrawer', () => ({ default: () => null }));

const setUpCard = (firstEnvCritical: boolean, autoDeployEnabled: boolean) => (
  <BuildArea
    componentId="orders"
    versionId="v1"
    orgHandler="acme"
    orgUuid="acme"
    projectId="default"
    deploymentPipelineId="production-first"
    flags={{} as ComponentTypeFlags}
    branch="main"
    commits={[]}
    firstEnvId={firstEnvCritical ? 'production' : 'development'}
    firstEnvTemplateId={firstEnvCritical ? 'production' : 'development'}
    firstEnvCritical={firstEnvCritical}
    autoDeployEnabled={autoDeployEnabled}
    componentName="orders"
    projectHandler="default"
    hideEndpoints
  />
);
const autoDeploySwitch = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="checkbox"]');
let unmount = () => {};
afterEach(() => unmount());

async function render(firstEnvCritical: boolean, autoDeployEnabled: boolean) {
  const r = await renderWithScopes(setUpCard(firstEnvCritical, autoDeployEnabled), DEVELOPER);
  unmount = r.unmount;
  return r.container;
}

describe('BuildArea (the Set Up card)', () => {
  it('refuses a Developer to deploy or turn auto-deploy on when the pipeline starts in production', async () => {
    const c = await render(true, false);
    expect(button(c, 'Deploy')?.disabled).toBe(true);
    expect(reasonFor(button(c, 'Deploy'))).toBe(PRODUCTION_REFUSAL);
    expect(autoDeploySwitch(c)?.disabled).toBe(true);
    expect(reasonFor(autoDeploySwitch(c) ?? undefined)).toBe(PRODUCTION_REFUSAL);
  });

  it('lets a Developer turn auto-deploy off when the pipeline starts in production', async () => {
    expect(autoDeploySwitch(await render(true, true))?.disabled).toBe(false);
  });

  it('lets a Developer deploy and turn auto-deploy on when the pipeline starts in development', async () => {
    const c = await render(false, false);
    expect(button(c, 'Deploy')?.disabled).toBe(false);
    expect(autoDeploySwitch(c)?.disabled).toBe(false);
  });
});
