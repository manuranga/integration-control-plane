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
import MoesifEmbed, { HANDSHAKE_TIMEOUT_MS, TOKEN_REFRESH_MS } from './MoesifEmbed';
import { fetchMoesifViewerToken } from '../../api/moesif';
// Keep unit tests offline; exercise the real URL builder separately.
vi.mock('../../paths', () => ({ moesifInsightsUrl: () => 'about:blank' }));
vi.mock('../../api/moesif', () => ({ fetchMoesifViewerToken: vi.fn() }));
vi.mock('@wso2/oxygen-ui', () => ({
  Box: ({ children, role }: { children: ReactNode; role?: string }) => <div role={role}>{children}</div>,
  Typography: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  CircularProgress: () => <span />,
  Alert: ({ children, action }: { children: ReactNode; action: ReactNode }) => (
    <div role="alert">
      {children}
      {action}
    </div>
  ),
  Button: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button>,
}));
const origin = 'https://www.moesif.com';
let container: HTMLDivElement;
let root: Root;
const retry = vi.fn();
async function render(key = 'org-a') {
  await act(async () => root.render(<MoesifEmbed key={key} origin={origin} apiBase="https://cloud.example" onRetry={retry} />));
}
function frame() {
  return container.querySelector('iframe')!;
}
async function message(type: string, source: MessageEventSource | null = frame().contentWindow, eventOrigin = origin) {
  await act(async () => window.dispatchEvent(new MessageEvent('message', { origin: eventOrigin, source, data: { type } })));
}
beforeEach(() => {
  vi.useFakeTimers();
  const windows = new WeakMap<HTMLIFrameElement, Window>();
  vi.spyOn(HTMLIFrameElement.prototype, 'contentWindow', 'get').mockImplementation(function (this: HTMLIFrameElement) {
    if (!windows.has(this)) windows.set(this, { postMessage: vi.fn() } as unknown as Window);
    return windows.get(this)!;
  });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(fetchMoesifViewerToken).mockResolvedValue('viewer-token');
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});
describe('Moesif embed lifecycle', () => {
  it('requires the configured origin AND iframe source before displaying data', async () => {
    await render();
    expect(frame().src).not.toContain('viewer-token');
    await message('ORG_LOAD_FINISHED', window);
    expect(frame().style.display).toBe('none');
    await message('ORG_LOAD_FINISHED', frame().contentWindow, 'https://web-dev.moesif.com');
    expect(frame().style.display).toBe('none');
    await message('SCHEMA_GEN_FINISHED');
    expect(frame().style.display).toBe('block');
  });
  it('delivers tokens only to the configured origin and refreshes on trusted request', async () => {
    await render();
    const post = vi.spyOn(frame().contentWindow!, 'postMessage');
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(post).toHaveBeenCalledWith({ type: 'SET_TOKEN', token: 'viewer-token' }, origin);
    await message('ORG_LOAD_FINISHED');
    await message('REFRESH_TOKEN', window);
    expect(fetchMoesifViewerToken).toHaveBeenCalledTimes(1);
    vi.mocked(fetchMoesifViewerToken).mockResolvedValue('refreshed');
    await message('REFRESH_TOKEN');
    expect(post).toHaveBeenLastCalledWith({ type: 'SET_TOKEN', token: 'refreshed' }, origin);
    await act(async () => {
      vi.advanceTimersByTime(TOKEN_REFRESH_MS);
    });
    expect(fetchMoesifViewerToken).toHaveBeenCalledTimes(3);
  });
  it('times out with retry instead of an endless spinner', async () => {
    await render();
    await act(async () => {
      vi.advanceTimersByTime(HANDSHAKE_TIMEOUT_MS);
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('did not finish loading');
    await act(async () => container.querySelector('button')!.click());
    expect(retry).toHaveBeenCalledOnce();
    expect(container.querySelector('iframe')).toBeNull();
  });
  it('hides the embed if refreshing the token fails', async () => {
    await render();
    await message('ORG_LOAD_FINISHED');
    vi.mocked(fetchMoesifViewerToken).mockRejectedValue(new Error('Unavailable'));
    await message('REFRESH_TOKEN');
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('Unavailable');
  });
  it('aborts previous org requests and ignores their late results', async () => {
    let resolveOld!: (value: string) => void;
    vi.mocked(fetchMoesifViewerToken).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    );
    await render();
    const oldSignal = vi.mocked(fetchMoesifViewerToken).mock.calls[0][1];
    await render('org-b');
    expect(oldSignal.aborted).toBe(true);
    const post = vi.spyOn(frame().contentWindow!, 'postMessage');
    await act(async () => resolveOld('old-org-token'));
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(post).toHaveBeenLastCalledWith({ type: 'SET_TOKEN', token: 'viewer-token' }, origin);
  });
});
