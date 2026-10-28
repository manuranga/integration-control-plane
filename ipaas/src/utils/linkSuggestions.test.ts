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
import { linkSuggestionRows } from './linkSuggestions';

const connections = ['wso2.sfdemo.sfSales', 'wso2.sfdemo.support.sfSupport'];
const suggestions = [
  { resourceType: 'salesforce-sales', displayName: 'Salesforce (sales)', package: 'ballerinax/salesforce', connections },
  { resourceType: 'salesforce-support', displayName: 'Salesforce (support)', package: 'ballerinax/salesforce', connections },
];
const pairs = (rows: ReturnType<typeof linkSuggestionRows>) => rows.map((r) => `${r.resourceType} → ${r.connection}`);

describe('linkSuggestionRows', () => {
  it('offers every resource of a variant through every connection', () => {
    expect(pairs(linkSuggestionRows(suggestions, []))).toEqual(['salesforce-sales → wso2.sfdemo.sfSales', 'salesforce-sales → wso2.sfdemo.support.sfSupport', 'salesforce-support → wso2.sfdemo.sfSales', 'salesforce-support → wso2.sfdemo.support.sfSupport']);
  });

  it('leaves out a linked resource and the connection its link supplies', () => {
    const links = [{ resourceType: 'salesforce-sales', configurables: { 'wso2.sfdemo.sfSalesBaseUrl': 'SALESFORCE_BASE_URL' } }];
    expect(pairs(linkSuggestionRows(suggestions, links))).toEqual(['salesforce-support → wso2.sfdemo.support.sfSupport']);
  });
});
