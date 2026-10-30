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

import type { LinkEnvironmentOutcome } from '../types/configuration';

const DONE = new Set(['rolled_out', 'unchanged']);
const NEXT_RELEASE = 'next_release';
const NOT_RESTORED = "; the Configure form's values were not restored";

/**
 * What to tell the user after a link write that didn't finish in every environment, or null when it did (or the
 * response has no report). A failed environment keeps the integration's own values unless its error says they
 * weren't restored; any other state than done is still rolling out.
 */
export function linkOutcomeMessage(resourceType: string, done: 'linked' | 'connected', report: LinkEnvironmentOutcome[] = []): { severity: 'warning' | 'info'; message: string } | null {
  const failed = report.filter((r) => r.state === 'failed');
  const pending = report.filter((r) => r.state !== 'failed' && r.state !== NEXT_RELEASE && !DONE.has(r.state)).map((r) => r.environment);
  const next = report.filter((r) => r.state === NEXT_RELEASE).map((r) => r.environment);
  const parts = [];
  if (next.length > 0) parts.push(`${resourceType} is ${done}. It takes effect in ${listed(next)} at each one's next release: the latest build's deploys now; promote it to the others.`);
  if (failed.length > 0) {
    const where = failed.map((r) => (r.error ? `${r.environment} (${r.error})` : r.environment));
    const kept = failed.every((r) => !r.error?.endsWith(NOT_RESTORED));
    parts.push(`${resourceType} is ${done}, except in ${listed(where)}.${kept ? ' The integration keeps its own values there.' : ''}`);
  }
  if (pending.length > 0) parts.push(`${failed.length > 0 ? 'It' : resourceType} is still rolling out in ${listed(pending)}.`);
  return parts.length === 0 ? null : { severity: failed.length > 0 ? 'warning' : 'info', message: parts.join(' ') };
}

const listed = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
