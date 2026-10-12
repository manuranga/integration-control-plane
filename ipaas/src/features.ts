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

/**
 * Build-time product flags. Vite replaces __PRODUCT__ with a string literal
 * at build time, so the minifier eliminates dead branches entirely — unused
 * product code never reaches the final bundle.
 *
 * Set at build time via:  PRODUCT=wip|cloud pnpm build
 * Default (dev server):   wip
 */

export const IS_WIP = __PRODUCT__ === 'wip'; // Choreo v2 / preview-dv
export const IS_CLOUD = __PRODUCT__ === 'cloud'; // Choreo v3 / cloud
