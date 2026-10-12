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

/** Four cards a row: five side by side squeeze every title onto two lines. */
export const providerGridSx = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
} as const;

export const providerCardSx = (disabled: boolean) =>
  ({
    px: 3,
    py: 2,
    borderColor: 'primary',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'border-color 0.15s',
    '&:hover': disabled ? {} : { borderColor: 'primary.main' },
  }) as const;

/** Header of every provider card, including the credential card: icon and title on one row. */
export const providerIconSx = {
  display: 'flex',
  flexShrink: 0,
  color: 'text.primary',
} as const;

export const providerTitleSx = {
  lineHeight: 1.3,
} as const;
