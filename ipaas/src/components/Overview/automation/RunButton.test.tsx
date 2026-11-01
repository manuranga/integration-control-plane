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

import { afterEach, describe, expect, it } from 'vitest';
import RunButton from './RunButton';
import { Scopes } from '../../../constants/permissions';
import { PRODUCTION_REFUSAL } from '../../../hooks/useCan';
import { button, reasonFor, renderWithScopes } from '../../../test/renderWithScopes';

const DEVELOPER = [Scopes.INTEGRATION_EXECUTE];
let unmount = () => {};
afterEach(() => unmount());

describe('RunButton', () => {
  it('refuses a Developer on a production card, with the reason', async () => {
    const r = await renderWithScopes(<RunButton envCritical onRun={() => {}} onRunWithArgs={() => {}} />, DEVELOPER);
    unmount = r.unmount;
    expect(button(r.container, 'Run')?.disabled).toBe(true);
    expect(reasonFor(button(r.container, 'Run'))).toBe(PRODUCTION_REFUSAL);
  });

  it('lets a Developer test in development', async () => {
    const r = await renderWithScopes(<RunButton envCritical={false} onRun={() => {}} onRunWithArgs={() => {}} />, DEVELOPER);
    unmount = r.unmount;
    expect(button(r.container, 'Test')?.disabled).toBe(false);
  });

  it('lets a role with production-write run in production', async () => {
    const r = await renderWithScopes(<RunButton envCritical onRun={() => {}} onRunWithArgs={() => {}} />, [...DEVELOPER, Scopes.PRODUCTION_WRITE]);
    unmount = r.unmount;
    expect(button(r.container, 'Run')?.disabled).toBe(false);
  });

  it('is not offered to a Viewer', async () => {
    const r = await renderWithScopes(<RunButton envCritical onRun={() => {}} onRunWithArgs={() => {}} />, []);
    unmount = r.unmount;
    expect(button(r.container, 'Run')).toBeUndefined();
  });
});
