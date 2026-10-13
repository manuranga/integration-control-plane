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

import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/e2e/helpers/*.test.ts'],
  },
  resolve: {
    alias: {
      // Tests use the WIP auth, a pairing no real build ships: cloud auth loads the Thunder
      // provider and its UI, which plain Node can't import. The API tests either mock _client
      // or only exercise pure mappers, so no test runs a request through WIP auth. Revisit if
      // one starts to.
      '#auth': path.resolve(__dirname, 'src/auth/wip'),
    },
  },
});
