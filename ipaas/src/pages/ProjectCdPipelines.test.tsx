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
import ProjectCdPipelines from './ProjectCdPipelines';
import { button, reasonFor, renderWithScopes } from '../test/renderWithScopes';
import { DEVELOPER, PLATFORM_ENGINEER } from '../test/roles';

const pipelines = [{ id: 'default', name: 'Default Pipeline', is_project_default: true, promotion_tree: { name: 'Root' } }];
vi.mock('../hooks/useProjects', () => ({ useProjectId: () => ({ projectId: 'orders', isLoading: false }) }));
vi.mock('../hooks/useDeploymentPipelines', () => ({
  useProjectDeploymentPipelines: () => ({ data: pipelines, isLoading: false, isError: false }),
  useEnvTemplates: () => ({ data: [] }),
}));
vi.mock('../components/CdPipelines/PipelineAccordionCard', () => ({ default: () => null }));

let unmount = () => {};
afterEach(() => unmount());

async function changePipeline(scopes: string[]) {
  const r = await renderWithScopes(<ProjectCdPipelines level="projects" org="acme" project="orders" />, scopes);
  unmount = r.unmount;
  return button(r.container, 'Change Pipeline');
}

describe('ProjectCdPipelines', () => {
  it('refuses a Developer to change the pipeline, with the reason', async () => {
    const b = await changePipeline(DEVELOPER);
    expect(b?.disabled).toBe(true);
    expect(reasonFor(b)).toBe("Your role doesn't allow changing the project's deployment pipeline.");
  });

  it('lets a Platform Engineer change the pipeline', async () => {
    expect((await changePipeline(PLATFORM_ENGINEER))?.disabled).toBe(false);
  });
});
