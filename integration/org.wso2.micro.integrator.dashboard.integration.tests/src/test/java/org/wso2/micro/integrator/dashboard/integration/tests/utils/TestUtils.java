/*
 * Copyright (c) 2021, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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
 */

package org.wso2.micro.integrator.dashboard.integration.tests.utils;

import org.wso2.carbon.automation.engine.context.AutomationContext;
import org.wso2.esb.integration.common.extensions.carbonserver.CarbonTestServerManager;

import java.util.HashMap;
import javax.xml.xpath.XPathExpressionException;

public class TestUtils {

    private static final int DASHBOARD_PORT = 9743;

    public static CarbonTestServerManager getNode(int offset) throws XPathExpressionException {

        HashMap<String, String> startupParameters = new HashMap<>();
        startupParameters.put("managementPort", String.valueOf(DASHBOARD_PORT));
        startupParameters.put("-DportOffset", String.valueOf(offset));
        startupParameters.put("startupScript", "dashboard");
        startupParameters.put("executables", "bin/dashboard.sh,bin/dashboard.bat");
        return new CarbonTestServerManager(new AutomationContext(), System.getProperty("carbon.zip"),
                                           startupParameters);
    }
}
