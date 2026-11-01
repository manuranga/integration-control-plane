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

import { IconButton, Tooltip } from '@wso2/oxygen-ui';
import { Trash2 } from '@wso2/oxygen-ui-icons-react';
import type { JSX } from 'react';
import { Scopes } from '../constants/permissions';
import { useIntegrationGate } from '../hooks/useIntegrationGate';
import type { Component } from '../types/component';

/** A project list row's Delete. Deleting is a production write when the integration runs in production. */
export default function DeleteIntegrationButton({ component, onClick }: { component: Component; onClick: () => void }): JSX.Element {
  const remove = useIntegrationGate(component.id)(Scopes.INTEGRATION_DELETE);
  return (
    <Tooltip title={remove.refusal || 'Delete'}>
      {/* Keeps the row from opening the integration, also when the button is disabled. */}
      <span onClick={(e) => e.stopPropagation()}>
        <IconButton size="small" color="error" aria-label={`Delete ${component.displayName}`} disabled={!!remove.refusal} onClick={onClick}>
          <Trash2 size={16} />
        </IconButton>
      </span>
    </Tooltip>
  );
}
