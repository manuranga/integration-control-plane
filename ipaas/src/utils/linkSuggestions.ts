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

import type { ResourceLink, ResourceLinkSuggestion } from '../types/configuration';

export interface LinkSuggestionRow extends ResourceLinkSuggestion {
  connection: string;
}

/**
 * One row per suggested resource and connection, leaving out a resource already linked and a
 * connection whose configurables a link already supplies: linking them again would clash with that link.
 */
export function linkSuggestionRows(suggestions: ResourceLinkSuggestion[], links: ResourceLink[]): LinkSuggestionRow[] {
  const linkedTypes = new Set(links.map((l) => l.resourceType));
  const linkedKeys = links.flatMap((l) => Object.keys(l.configurables));
  return suggestions.filter((s) => !linkedTypes.has(s.resourceType)).flatMap((s) => s.connections.filter((c) => !linkedKeys.some((k) => k.startsWith(c))).map((connection) => ({ ...s, connection })));
}
