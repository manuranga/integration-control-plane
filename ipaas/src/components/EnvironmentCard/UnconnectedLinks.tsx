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

import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@wso2/oxygen-ui';
import { useConnectResourceLink } from '../../hooks/useConfiguration';
import type { ResourceLink } from '../../types/configuration';
import { LinkOutcome } from './LinkOutcome';

interface UnconnectedLinksProps {
  projectId: string;
  componentId: string;
  links: ResourceLink[];
}

const boxSx = { mb: 1.5, p: 1.5, border: '1px solid', borderColor: 'warning.main', borderRadius: 1 } as const;
const rowSx = { py: 0.75, borderTop: '1px solid', borderColor: 'divider' } as const;
const monoSx = { fontFamily: 'monospace' } as const;

/**
 * Links that supply no configurable: made without a connection, such as on WSO2 Cloud, or through a connection a later
 * build removed. The links refresh connects one it can by itself once every environment runs the latest build; the user
 * connects the others.
 */
export function UnconnectedLinks({ projectId, componentId, links }: UnconnectedLinksProps) {
  const unconnected = links.filter((l) => Object.keys(l.configurables).length === 0);
  const connect = useConnectResourceLink();
  const outcome = connect.data && <LinkOutcome resourceType={connect.variables.resourceType} done="connected" report={connect.data.report} />;
  if (unconnected.length === 0) return outcome || null;

  return (
    <>
      {outcome}
      <Box sx={boxSx}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          Linked resources not connected
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          These links aren&apos;t connected to any connection in this integration, so no configurable reads their keys. Connecting one supplies a connection&apos;s configurables from it in every environment and redeploys the integration.
        </Typography>
        {unconnected.map((l) => (
          <LinkRow
            key={l.resourceType}
            link={l}
            busy={connect.isPending}
            pending={connect.isPending && connect.variables?.resourceType === l.resourceType}
            onConnect={(connection) => connect.mutate({ projectId, componentId, resourceType: l.resourceType, connection })}
          />
        ))}
        {connect.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {connect.error instanceof Error ? connect.error.message : 'Failed to connect the resource'}
          </Alert>
        )}
      </Box>
    </>
  );
}

function LinkRow({ link, busy, pending, onConnect }: { link: ResourceLink; busy: boolean; pending: boolean; onConnect: (connection: string) => void }) {
  const connections = link.connections ?? [];
  const [picked, setPicked] = useState('');
  const choice = connections.length === 1 ? connections[0] : picked;
  const manual = !link.connectsOnRefresh && connections.length > 0;

  return (
    <Stack direction="row" alignItems="center" gap={1} sx={rowSx}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2">{link.resourceType}</Typography>
        {connections.length === 0 && (
          <Typography variant="caption" color="text.secondary">
            No connection in this integration is named after its keys.
          </Typography>
        )}
        {link.connectsOnRefresh && (
          <Typography variant="caption" color="text.secondary">
            Connects through{' '}
            <Box component="span" sx={monoSx}>
              {connections[0]}
            </Box>{' '}
            once every environment runs the latest build.
          </Typography>
        )}
        {manual && connections.length === 1 && (
          <Typography variant="caption" color="text.secondary" sx={monoSx}>
            {connections[0]}
          </Typography>
        )}
        {manual && connections.length > 1 && (
          <TextField select size="small" fullWidth label="Connection" value={picked} onChange={(e) => setPicked(e.target.value)} sx={{ mt: 1 }}>
            {connections.map((c) => (
              <MenuItem key={c} value={c} sx={monoSx}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
      {manual && (
        <Button size="small" variant="outlined" aria-label={`Connect ${link.resourceType}`} startIcon={pending ? <CircularProgress size={14} /> : undefined} disabled={busy || !choice} onClick={() => onConnect(choice)}>
          Connect
        </Button>
      )}
    </Stack>
  );
}
