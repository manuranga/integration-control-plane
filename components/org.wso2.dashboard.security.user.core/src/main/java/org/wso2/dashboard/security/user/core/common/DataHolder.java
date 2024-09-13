/*
 * Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.wso2.dashboard.security.user.core.common;

import org.apache.axis2.context.ConfigurationContext;
import org.wso2.dashboard.security.user.core.UserStoreManager;
import org.wso2.micro.integrator.security.user.api.RealmConfiguration;

/**
 * Store the realm configuration and user store manager for the Dashboard security scenarios
 */
public class DataHolder {

    private RealmConfiguration realmConfig;
    private UserStoreManager userStoreManager;
    private ConfigurationContext configCtx;

    public final static DataHolder instance = new DataHolder();

    public static DataHolder getInstance() {
        return instance;
    }

    public RealmConfiguration getRealmConfig() {
        return realmConfig;
    }

    public void setRealmConfig(RealmConfiguration realmConfig) {
        this.realmConfig = realmConfig;
    }

    public UserStoreManager getUserStoreManager() {
        return userStoreManager;
    }

    public void setUserStoreManager(UserStoreManager userStoreManager) {
        this.userStoreManager = userStoreManager;
    }

    public ConfigurationContext getConfigCtx() {
        return configCtx;
    }

    public void setConfigCtx(ConfigurationContext configCtx) {
        this.configCtx = configCtx;
    }
}
