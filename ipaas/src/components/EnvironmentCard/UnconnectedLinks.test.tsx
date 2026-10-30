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

import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnconnectedLinks } from './UnconnectedLinks';

const mutate = vi.fn();
const connected = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../hooks/useConfiguration', () => ({ useConnectResourceLink: () => ({ mutate, isPending: false, isError: false, ...connected.current }) }));
vi.mock('@wso2/oxygen-ui', () => {
  const Plain = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    Alert: Plain,
    Box: Plain,
    Stack: Plain,
    Typography: Plain,
    CircularProgress: () => <span />,
    MenuItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
    TextField: ({ children, value, onChange }: { children: ReactNode; value: string; onChange: (e: { target: { value: string } }) => void }) => (
      <select value={value} onChange={(e) => onChange({ target: { value: e.target.value } })}>
        <option value="" />
        {children}
      </select>
    ),
    Button: ({ children, onClick, disabled, 'aria-label': label }: { children: ReactNode; onClick: () => void; disabled: boolean; 'aria-label': string }) => (
      <button aria-label={label} disabled={disabled} onClick={onClick}>
        {children}
      </button>
    ),
  };
});

let container: HTMLDivElement;
let root: Root;
const render = (links: Parameters<typeof UnconnectedLinks>[0]['links']) => act(async () => root.render(<UnconnectedLinks projectId="default" componentId="sfdemo" links={links} />));
const connectButton = () => container.querySelector<HTMLButtonElement>('button[aria-label="Connect salesforce-sales"]');

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  mutate.mockReset();
  connected.current = {};
});

describe('UnconnectedLinks', () => {
  it('shows nothing while every link supplies configurables', async () => {
    await render([{ resourceType: 'salesforce-sales', configurables: { 'wso2.sfdemo.sfSalesBaseUrl': 'SALESFORCE_BASE_URL' } }]);
    expect(container.textContent).toBe('');
  });

  it('leaves a link the refresh connects by itself to the refresh, with nothing to press', async () => {
    await render(JSON.parse('[{"resourceType":"salesforce-sales","configurables":{},"connections":["wso2.sfdemo.sfSales"],"connectsOnRefresh":true}]'));
    expect(container.textContent).toContain('Connects through wso2.sfdemo.sfSales once every environment runs the latest build.');
    expect(container.textContent).not.toContain('WSO2 Cloud');
    expect(container.querySelector('select')).toBeNull();
    expect(connectButton()).toBeNull();
  });

  it('offers Connect through the one free connection when the refresh leaves the link alone, as after its connection was deleted', async () => {
    await render(JSON.parse('[{"resourceType":"salesforce-sales","configurables":{},"connections":["wso2.sfdemo.sfDesk"]}]'));
    expect(container.textContent).not.toContain('once every environment runs the latest build');
    expect(container.textContent).toContain('The latest build has no connection these links go through');
    await act(async () => connectButton()!.click());
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ resourceType: 'salesforce-sales', connection: 'wso2.sfdemo.sfDesk' }));
  });

  it('says where Connect failed, after the link has left the list', async () => {
    connected.current = {
      data: JSON.parse('{"resourceType":"salesforce-sales","configurables":{"wso2.sfdemo.sfDeskBaseUrl":"SALESFORCE_BASE_URL"},"report":[{"environment":"development","state":"rolled_out"},{"environment":"production","state":"failed","error":"status 422"}]}'),
      variables: { projectId: 'default', componentId: 'sfdemo', resourceType: 'salesforce-sales', connection: 'wso2.sfdemo.sfDesk' },
    };
    await render([{ resourceType: 'salesforce-sales', configurables: { 'wso2.sfdemo.sfDeskBaseUrl': 'SALESFORCE_BASE_URL' } }]);
    expect(container.textContent).toBe('salesforce-sales is connected, except in production (status 422). The integration keeps its own values there.');
  });

  it('asks which connection when several are free', async () => {
    await render([{ resourceType: 'salesforce-sales', configurables: {}, connections: ['wso2.sfdemo.sfSales', 'wso2.sfdemo.support.sfDesk'] }]);
    expect(connectButton()!.disabled).toBe(true);
    const select = container.querySelector('select')!;
    await act(async () => {
      select.value = 'wso2.sfdemo.support.sfDesk';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => connectButton()!.click());
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ connection: 'wso2.sfdemo.support.sfDesk' }));
  });

  it.each(['[{"resourceType":"salesforce-sales","configurables":{},"connections":[]}]', '[{"resourceType":"salesforce-sales","configurables":{}}]'])('says so when no connection matches, with nothing to press: %s', async (body) => {
    await render(JSON.parse(body));
    expect(container.textContent).toContain('No connection in this integration is named after its keys.');
    expect(connectButton()).toBeNull();
  });
});
