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

// Under a base path this console shares one origin with the other WSO2 Cloud consoles, and
// localStorage and sessionStorage are keyed by origin alone. Generic names like 'org_handle'
// would then be the same slot for every console, so this console's keys carry a prefix.
// The copilot constants already use it.
const PREFIX = 'icp:';

/** The stored name for a key: 'org_handle' is kept as 'icp:org_handle'. */
export function prefixed(key: string): string {
  return `${PREFIX}${key}`;
}

interface ScopedStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

function scoped(storage: () => Storage): ScopedStorage {
  return {
    // Values written by builds from before the prefix are adopted once, so a signed-in
    // user keeps their organization, last project and accepted terms across the upgrade.
    get(key) {
      const store = storage();
      const current = store.getItem(prefixed(key));
      if (current !== null) return current;
      const legacy = store.getItem(key);
      if (legacy === null) return null;
      store.setItem(prefixed(key), legacy);
      store.removeItem(key);
      return legacy;
    },
    set(key, value) {
      storage().setItem(prefixed(key), value);
    },
    remove(key) {
      const store = storage();
      store.removeItem(prefixed(key));
      store.removeItem(key);
    },
  };
}

/** This console's localStorage, for values that outlive the tab. */
export const local = scoped(() => localStorage);

/** This console's sessionStorage, for values that belong to one tab. */
export const session = scoped(() => sessionStorage);
