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

import { describe, expect, it } from 'vitest';
import type { ResourceLinkWrite } from '../types/configuration';
import { linkOutcomeMessage } from './linkOutcome';

const outcome = (body: string) => linkOutcomeMessage('salesforce-sales', 'linked', (JSON.parse(body) as ResourceLinkWrite).report);
const link = '"resourceType":"salesforce-sales","configurables":{"acme.sfdemo.sfSalesBaseUrl":"SALESFORCE_BASE_URL"}';

describe('linkOutcomeMessage', () => {
  it('says nothing for a response without a report, or one done everywhere', () => {
    expect(outcome(`{${link}}`)).toBeNull();
    expect(outcome(`{${link},"report":[{"environment":"development","state":"rolled_out"},{"environment":"production","state":"unchanged"}]}`)).toBeNull();
  });

  it("names the failed environments with the platform's error, and that they keep their own values", () => {
    expect(outcome(`{${link},"report":[{"environment":"development","state":"rolled_out"},{"environment":"production","state":"failed","error":"status 422"}]}`)).toEqual({
      severity: 'warning',
      message: 'salesforce-sales is linked, except in production (status 422). The integration keeps its own values there.',
    });
  });

  it("doesn't say the integration keeps its values where they weren't restored", () => {
    expect(outcome(`{${link},"report":[{"environment":"production","state":"failed","error":"status 422; the Configure form's values were not restored"}]}`)?.message).toBe(
      "salesforce-sales is linked, except in production (status 422; the Configure form's values were not restored).",
    );
  });

  it('says where the link is still rolling out, after any failure', () => {
    expect(outcome(`{${link},"report":[{"environment":"development","state":"pending"},{"environment":"staging","state":"pending"}]}`)).toEqual({
      severity: 'info',
      message: 'salesforce-sales is still rolling out in development and staging.',
    });
    expect(outcome(`{${link},"report":[{"environment":"development","state":"pending"},{"environment":"production","state":"failed"}]}`)?.message).toBe(
      'salesforce-sales is linked, except in production. The integration keeps its own values there. It is still rolling out in development.',
    );
  });

  it('says each environment gets the link at its next release', () => {
    expect(outcome(`{${link},"report":[{"environment":"development","state":"next_release"},{"environment":"production","state":"next_release"}]}`)).toEqual({
      severity: 'info',
      message: 'salesforce-sales is linked. The latest build is redeploying with it; other environments get it when you promote it to them.',
    });
  });
});
