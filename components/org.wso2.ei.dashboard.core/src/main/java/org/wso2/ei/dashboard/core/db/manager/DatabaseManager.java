/*
 * Copyright (c) 2020, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
 *
 */

package org.wso2.ei.dashboard.core.db.manager;

import org.wso2.ei.dashboard.core.rest.delegates.heartbeat.HeartbeatObject;
import org.wso2.ei.dashboard.core.rest.model.GroupList;
import org.wso2.ei.dashboard.core.rest.model.NodeList;
import org.wso2.ei.dashboard.core.rest.model.ProxyList;

import java.util.List;

/**
 * This interface represents database operations.
 */
public interface DatabaseManager {

    boolean insertHeartbeat(HeartbeatObject heartbeat);

    boolean updateHeartbeat(HeartbeatObject heartbeat);

    int deleteHeartbeat(HeartbeatObject heartbeat);

    boolean checkIfTimestampExceedsInitial(HeartbeatObject heartbeat, String initialTimestamp);

    String retrieveTimestampOfHeartBeat(HeartbeatObject heartbeat);

    boolean insertServerInformation(HeartbeatObject heartbeat, String serverInfo);

    boolean insertProxyServices(HeartbeatObject heartbeat, String serviceName, String details);

    boolean insertApis(HeartbeatObject heartbeat, String apiName, String details);

    GroupList fetchGroups();

    NodeList fetchNodes(String groupId);

    ProxyList fetchProxyServices(String groupId, List<String> nodeList);

}
