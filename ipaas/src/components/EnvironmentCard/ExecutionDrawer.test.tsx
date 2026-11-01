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
import ExecutionDrawer from './ExecutionDrawer';
import { Scopes } from '../../constants/permissions';
import { PRODUCTION_REFUSAL } from '../../hooks/useCan';
import { button, reasonFor, renderWithScopes } from '../../test/renderWithScopes';

const noArgs: never[] = [];
vi.mock('../../hooks/useExecutions', () => ({
  useExecutionArguments: () => ({ data: noArgs, isLoading: false }),
  useTriggerComponent: () => ({ mutate: vi.fn(), isPending: false }),
}));

const execution = { id: 'job-abc123', startTime: '', completionTime: '', runId: 'run-1', revisionId: 'rev-1', failedReason: '', status: 'Succeeded' };
const drawer = (envCritical: boolean) => <ExecutionDrawer open execution={execution} onClose={() => {}} orgHandler="acme" projectHandler="default" componentHandler="task" projectId="default" componentId="task" releaseId="task-1" envCritical={envCritical} />;
let unmount = () => {};
afterEach(() => unmount());

describe('ExecutionDrawer', () => {
  it('shows a Viewer the execution, with nothing to execute', async () => {
    const r = await renderWithScopes(drawer(true), []);
    unmount = r.unmount;
    expect(document.body.textContent).toContain('rev-1');
    expect(button(r.container, 'Execute')).toBeUndefined();
  });

  it('refuses a Developer in production, with the reason', async () => {
    const r = await renderWithScopes(drawer(true), [Scopes.INTEGRATION_EXECUTE]);
    unmount = r.unmount;
    expect(button(r.container, 'Execute')?.disabled).toBe(true);
    expect(reasonFor(button(r.container, 'Execute'))).toBe(PRODUCTION_REFUSAL);
  });

  it('lets a Developer execute in development', async () => {
    const r = await renderWithScopes(drawer(false), [Scopes.INTEGRATION_EXECUTE]);
    unmount = r.unmount;
    expect(button(r.container, 'Execute')?.disabled).toBe(false);
  });
});
