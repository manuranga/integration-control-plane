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
 *
 *
 */
package org.wso2.ei.dashboard.core.exception.mappers;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.wso2.ei.dashboard.core.exception.UnAuthorizedException;

import java.util.HashMap;
import java.util.Map;

import javax.ws.rs.core.Response;
import javax.ws.rs.ext.ExceptionMapper;
import javax.ws.rs.ext.Provider;

/**
 * This class is managing the unauthorized exceptions.
 */
@Provider
public class UnAuthorizedManager implements ExceptionMapper<UnAuthorizedException> {

    private static final Logger logger = LogManager.getLogger(UnAuthorizedManager.class);

    @Override
    public Response toResponse(UnAuthorizedException e) {

        logger.debug("Error: ", e);
        Map<String, String> responseBody = new HashMap<>();
        responseBody.put("message", "Unauthorized");

        return Response.status(Response.Status.UNAUTHORIZED)
                .entity(responseBody)
                .header("content" +
                        "-type", "application/json").build();
    }
}
