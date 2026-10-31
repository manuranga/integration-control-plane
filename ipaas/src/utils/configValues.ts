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

import { getRequiredPathsAtLevel } from '../components/SchemaConfigForm/schemaUtils';
import type { SchemaConfigData } from '../types/configuration';
import type { MiConfig } from '../types/envGroups';

/** A configuration value as the read-only view shows it. A secret's value is never carried. */
export interface ConfigValue {
  key: string;
  value: string;
  secret: boolean;
}

/** The stored values, then the required keys that have none. */
export function schemaConfigValues(data: SchemaConfigData): ConfigValue[] {
  const stored = (data.configurations ?? []).map((c) => ({ key: c.key, value: c.isSensitive ? '' : (c.values?.[0]?.value ?? ''), secret: !!c.isSensitive }));
  const storedKeys = new Set(stored.map((v) => v.key));
  const unset = requiredConfigKeys(data.jsonSchema)
    .filter((key) => !storedKeys.has(key))
    .map((key) => ({ key, value: '', secret: false }));
  return [...stored, ...unset];
}

/** The scalar keys the base64 JSON schema requires. */
export function requiredConfigKeys(jsonSchema?: string): string[] {
  if (!jsonSchema) return [];
  try {
    return getRequiredPathsAtLevel(JSON.parse(atob(jsonSchema))).filter((p) => !p.includes('[*]') && !p.includes('.*'));
  } catch {
    return [];
  }
}

export const miConfigValues = (config: MiConfig): ConfigValue[] => [...config.envVars.map((e) => ({ ...e, secret: false })), ...config.secrets.map((key) => ({ key, value: '', secret: true }))];
