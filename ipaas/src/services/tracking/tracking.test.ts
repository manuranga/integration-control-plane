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

import { beforeEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('../../auth', () => ({ getSession: () => session.current }));

const moesifClient = vi.hoisted(() => ({ start: vi.fn(), stop: vi.fn(), track: vi.fn(), identifyUser: vi.fn(), identifyCompany: vi.fn() }));
const moesifInit = vi.hoisted(() => vi.fn(() => moesifClient));
vi.mock('moesif-browser-js', () => ({ default: { init: moesifInit } }));

import { initTracking, trackEvent } from './tracking';

function setActiveGroups(value: string | undefined): void {
  if (value === undefined) {
    delete (globalThis as Record<string, unknown>).OnetrustActiveGroups;
  } else {
    (globalThis as Record<string, unknown>).OnetrustActiveGroups = value;
  }
}

describe('initTracking', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    delete (window as unknown as Record<string, unknown>).dataLayer;
    delete (window as unknown as Record<string, unknown>).OptanonWrapper;
    delete (globalThis as Record<string, unknown>).OneTrust;
    delete (window as unknown as Record<string, unknown>).API_CONFIG;
    setActiveGroups(undefined);

    session.current = null;

    moesifInit.mockClear();
    moesifClient.start.mockClear();
    moesifClient.stop.mockClear();
    moesifClient.track.mockClear();
    moesifClient.identifyUser.mockClear();
    moesifClient.identifyCompany.mockClear();
  });

  it('does not load GTM before analytics consent is granted', () => {
    initTracking();
    setActiveGroups('C0001'); // strictly necessary only — no analytics consent
    window.OptanonWrapper?.();

    expect(document.head.querySelector('script[src*="googletagmanager.com/gtm.js"]')).toBeNull();
  });

  it('does not initialize Moesif before analytics consent is granted', () => {
    (window as unknown as { API_CONFIG: unknown }).API_CONFIG = { moesifAppApiKey: 'test-key' };

    initTracking();
    setActiveGroups('C0001'); // strictly necessary only — no analytics consent
    window.OptanonWrapper?.();

    expect(moesifInit).not.toHaveBeenCalled();
  });

  it('initializes and starts Moesif once analytics consent is granted', () => {
    (window as unknown as { API_CONFIG: unknown }).API_CONFIG = { moesifAppApiKey: 'test-key' };

    initTracking();
    setActiveGroups('C0001,C0002');
    window.OptanonWrapper?.();

    expect(moesifInit).toHaveBeenCalledWith(expect.objectContaining({ applicationId: 'test-key' }));
    expect(moesifClient.start).toHaveBeenCalledTimes(1);
  });

  it('stops Moesif when analytics consent is later withdrawn', () => {
    (window as unknown as { API_CONFIG: unknown }).API_CONFIG = { moesifAppApiKey: 'test-key' };
    let onConsentChanged: (() => void) | undefined;
    (globalThis as Record<string, unknown>).OneTrust = {
      OnConsentChanged: (callback: () => void) => {
        onConsentChanged = callback;
      },
    };

    initTracking();
    setActiveGroups('C0001,C0002');
    window.OptanonWrapper?.();
    expect(moesifClient.start).toHaveBeenCalledTimes(1);

    setActiveGroups('C0001');
    onConsentChanged?.();

    expect(moesifClient.stop).toHaveBeenCalledTimes(1);
  });

  it('loads the dev/stage GTM container and CookiePro test domain script by default', () => {
    initTracking();
    setActiveGroups('C0001,C0002');
    window.OptanonWrapper?.();

    const gtmScript = document.head.querySelector('script[src*="googletagmanager.com/gtm.js"]');
    expect(gtmScript?.getAttribute('src')).toContain('GTM-58K3W2QB');
    const cookieProScript = document.head.querySelector('script[src*="cookiepro"]');
    expect(cookieProScript?.getAttribute('data-domain-script')).toBe('486163bc-a8c5-40d8-b185-c707cc718a23-test');
  });

  it('loads the prod GTM container and CookiePro prod domain script when trackingEnv is prod', () => {
    (window as unknown as { API_CONFIG: unknown }).API_CONFIG = { trackingEnv: 'prod' };

    initTracking();
    setActiveGroups('C0001,C0002');
    window.OptanonWrapper?.();

    const gtmScript = document.head.querySelector('script[src*="googletagmanager.com/gtm.js"]');
    expect(gtmScript?.getAttribute('src')).toContain('GTM-5VPGH8GR');
    const cookieProScript = document.head.querySelector('script[src*="cookiepro"]');
    expect(cookieProScript?.getAttribute('data-domain-script')).toBe('486163bc-a8c5-40d8-b185-c707cc718a23');
  });

  it('injects GTM only once across repeated consent-change events', () => {
    let onConsentChanged: (() => void) | undefined;
    (globalThis as Record<string, unknown>).OneTrust = {
      OnConsentChanged: (callback: () => void) => {
        onConsentChanged = callback;
      },
    };

    initTracking();
    setActiveGroups('C0001,C0002');
    window.OptanonWrapper?.();
    onConsentChanged?.();
    onConsentChanged?.();

    expect(document.head.querySelectorAll('script[src*="googletagmanager.com/gtm.js"]')).toHaveLength(1);
  });
});

describe('trackEvent', () => {
  // The Moesif client is module state, created on first consent; one consented init serves the block.
  beforeEach(() => {
    (window as unknown as { API_CONFIG: unknown }).API_CONFIG = { moesifAppApiKey: 'test-key' };
    initTracking();
    setActiveGroups('C0001,C0002');
    window.OptanonWrapper?.();
    session.current = { user: { userId: 'u-1', username: 'jane@wso2.com', displayName: 'Jane' }, orgHandle: 'acme', orgUuid: 'org-1' };
    moesifClient.track.mockClear();
    moesifClient.identifyUser.mockClear();
    moesifClient.identifyCompany.mockClear();
  });

  it('sends a mapped event under its Moesif name with snake_cased properties', () => {
    trackEvent('component-create-submit', { integrationType: 'automation' });

    expect(moesifClient.track).toHaveBeenCalledWith('Component-Created-Submit', expect.objectContaining({ product: 'integration', idp_id: 'u-1', is_wso2_user: true, integration_type: 'automation' }));
  });

  it('adds the mapped fixed properties', () => {
    trackEvent('component-test');

    expect(moesifClient.track).toHaveBeenCalledWith('Component-Viewed-Page', expect.objectContaining({ page: 'test' }));
  });

  it('ignores an unmapped event', () => {
    trackEvent('not-a-real-event');

    expect(moesifClient.track).not.toHaveBeenCalled();
  });

  it('identifies the user and organization when asked', () => {
    trackEvent('login-clickbutton-success', undefined, true);

    expect(moesifClient.identifyUser).toHaveBeenCalledWith('u-1', { email: 'jane@wso2.com', name: 'Jane', isWSO2User: true });
    expect(moesifClient.identifyCompany).toHaveBeenCalledWith('org-1', { name: 'acme' });
  });
});
