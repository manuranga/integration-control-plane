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
import ScheduleButton from './ScheduleButton';
import { Scopes } from '../../../constants/permissions';
import { PRODUCTION_REFUSAL } from '../../../hooks/useCan';
import { button, reasonFor, renderWithScopes } from '../../../test/renderWithScopes';

vi.mock('./ScheduleDialog', () => ({ default: () => null }));

const schedule = (envCritical: boolean) => <ScheduleButton envId="production" envName="Production" envCritical={envCritical} componentId="task" orgHandler="acme" releaseId="task-1" versionId="v1" deploymentPipelineId="default" hasSchedule={false} />;
let unmount = () => {};
afterEach(() => unmount());

describe('ScheduleButton', () => {
  it('refuses a Developer on a production card, with the reason', async () => {
    const r = await renderWithScopes(schedule(true), [Scopes.INTEGRATION_UPDATE]);
    unmount = r.unmount;
    expect(button(r.container, 'Schedule')?.disabled).toBe(true);
    expect(reasonFor(button(r.container, 'Schedule'))).toBe(PRODUCTION_REFUSAL);
  });

  it('lets a Developer schedule in development', async () => {
    const r = await renderWithScopes(schedule(false), [Scopes.INTEGRATION_UPDATE]);
    unmount = r.unmount;
    expect(button(r.container, 'Schedule')?.disabled).toBe(false);
  });

  it('is not offered to a Viewer', async () => {
    const r = await renderWithScopes(schedule(false), []);
    unmount = r.unmount;
    expect(button(r.container, 'Schedule')).toBeUndefined();
  });
});
