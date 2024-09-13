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

package org.wso2.dashboard.security.user.core;

import org.apache.axiom.om.OMElement;
import org.apache.axiom.om.impl.builder.StAXOMBuilder;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.wso2.micro.integrator.security.user.api.RealmConfiguration;
import org.wso2.micro.integrator.security.user.core.UserCoreConstants;
import org.wso2.micro.integrator.security.user.core.UserStoreException;

import org.wso2.micro.integrator.security.vault.SecureVaultException;
import org.wso2.securevault.SecretResolver;
import org.wso2.securevault.SecretResolverFactory;
import org.wso2.securevault.commons.MiscellaneousUtil;

import javax.xml.namespace.QName;
import javax.xml.stream.XMLStreamException;
import java.io.*;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.regex.Pattern;


/**
 * This class is responsible for loading the realm configuration from the user-mgt.xml file.
 */
public class RealmConfigXMLProcessor {

    public static final String REALM_CONFIG_FILE = "user-mgt.xml";
    private static final Log log = LogFactory.getLog(RealmConfigXMLProcessor.class);
    InputStream inStream = null;
    private SecretResolver secretResolver;

    public RealmConfigXMLProcessor() {

    }

    public RealmConfiguration buildRealmConfigurationFromFile() throws UserStoreException {
        try {
            OMElement realmElement = this.getRealmElement();
            RealmConfiguration realmConfig = this.buildRealmConfiguration(realmElement);
            if (this.inStream != null) {
                this.inStream.close();
            }
            return realmConfig;
        } catch (Exception e) {
            String message = "Error while reading realm configuration from file";
            throw new UserStoreException(message, e);
        }
    }

    private OMElement preProcessRealmConfig(InputStream inStream) throws XMLStreamException {
        StAXOMBuilder builder = new StAXOMBuilder(inStream);
        OMElement documentElement = builder.getDocumentElement();
        OMElement realmElement = documentElement.getFirstChildWithName(new QName("Realm"));
        return realmElement;
    }

    public RealmConfiguration buildRealmConfiguration(InputStream inStream) throws UserStoreException {
        String message;
        try {
            OMElement realmElement = this.preProcessRealmConfig(inStream);
            RealmConfiguration realmConfig = this.buildRealmConfiguration(realmElement);
            if (inStream != null) {
                inStream.close();
            }

            return realmConfig;
        } catch (RuntimeException var5) {
            message = "An unexpected error occurred while building the realm configuration.";
            if (log.isDebugEnabled()) {
                log.debug(message, var5);
            }

            throw new UserStoreException(message, var5);
        } catch (Exception var6) {
            message = "Error while reading realm configuration from file";
            if (log.isDebugEnabled()) {
                log.debug(message, var6);
            }

            throw new UserStoreException(message, var6);
        }
    }

    public RealmConfiguration buildRealmConfiguration(OMElement realmElem) throws UserStoreException {
        return this.buildRealmConfiguration(realmElem, true);
    }

    public RealmConfiguration buildRealmConfiguration(OMElement realmElem, boolean superTenant) throws UserStoreException {
        RealmConfiguration realmConfig = null;
        String userStoreClass = null;
        String addAdmin = null;
        String adminRoleName = null;
        String adminUserName = null;
        String adminPassword = null;
        String everyOneRoleName = null;
        String realmClass = null;
        String description = null;
        Map<String, String> userStoreProperties = null;
        Map<String, String> realmProperties = null;
        boolean passwordsExternallyManaged = false;
        realmClass = realmElem.getAttributeValue(new QName("class"));
        OMElement mainConfig = realmElem.getFirstChildWithName(new QName("Configuration"));
        realmProperties = this.getChildPropertyElements(mainConfig, this.secretResolver);
        String dbUrl = this.constructDatabaseURL((String) realmProperties.get("url"));
        realmProperties.put("url", dbUrl);
        if (mainConfig.getFirstChildWithName(new QName("AddAdmin")) != null && !mainConfig.getFirstChildWithName(new QName("AddAdmin")).getText().trim().equals("")) {
            addAdmin = mainConfig.getFirstChildWithName(new QName("AddAdmin")).getText().trim();
        } else {
            if (superTenant) {
                log.error("AddAdmin configuration not found or invalid in user-mgt.xml. Cannot start server!");
                throw new UserStoreException("AddAdmin configuration not found or invalid user-mgt.xml. Cannot start server!");
            }

            log.debug("AddAdmin configuration not found");
            addAdmin = "true";
        }

        OMElement reservedRolesElm = mainConfig.getFirstChildWithName(new QName("ReservedRoleNames"));
        String[] reservedRoles = new String[0];
        if (reservedRolesElm != null && !reservedRolesElm.getText().trim().equals("")) {
            String rolesStr = reservedRolesElm.getText().trim();
            if (rolesStr.contains(",")) {
                reservedRoles = rolesStr.split(",");
            } else {
                reservedRoles = rolesStr.split(";");
            }
        }

        OMElement restrictedDomainsElm = mainConfig.getFirstChildWithName(new QName("RestrictedDomainsForSelfSignUp"));
        String[] restrictedDomains = new String[0];
        if (restrictedDomainsElm != null && !restrictedDomainsElm.getText().trim().equals("")) {
            String domain = restrictedDomainsElm.getText().trim();
            if (domain.contains(",")) {
                restrictedDomains = domain.split(",");
            } else {
                restrictedDomains = domain.split(";");
            }
        }

        OMElement adminUser = mainConfig.getFirstChildWithName(new QName("AdminUser"));
        adminUserName = adminUser.getFirstChildWithName(new QName("UserName")).getText().trim();
        OMElement adminPasswordElement =
                adminUser.getFirstChildWithName(new QName(UserCoreConstants.RealmConfig.LOCAL_NAME_PASSWORD));

        adminPassword = adminPasswordElement.getText().trim();

        adminRoleName = mainConfig.getFirstChildWithName(new QName("AdminRole")).getText().trim();
        everyOneRoleName = mainConfig.getFirstChildWithName(new QName("EveryOneRoleName")).getText().trim();
        Iterator<OMElement> iterator = realmElem.getChildrenWithName(new QName("UserStoreManager"));
        RealmConfiguration primaryConfig = null;
        RealmConfiguration tmpConfig = null;

        String readOnly;
        String adminRoleDomain;
        while (iterator.hasNext()) {
            OMElement usaConfig = (OMElement) iterator.next();
            userStoreClass = usaConfig.getAttributeValue(new QName("class"));
            if (usaConfig.getFirstChildWithName(new QName("Description")) != null) {
                description = usaConfig.getFirstChildWithName(new QName("Description")).getText().trim();
            }

            userStoreProperties = this.getChildPropertyElements(usaConfig, this.secretResolver);
            readOnly = (String) userStoreProperties.get("PasswordsExternallyManaged");
            Map<String, String> multipleCredentialsProperties = this.getMultipleCredentialsProperties(usaConfig);
            if (null != readOnly && !readOnly.trim().equals("")) {
                passwordsExternallyManaged = Boolean.parseBoolean(readOnly);
            } else if (log.isDebugEnabled()) {
                log.debug("External password management is disabled.");
            }

            realmConfig = new RealmConfiguration();
            realmConfig.setRealmClassName(realmClass);
            realmConfig.setUserStoreClass(userStoreClass);
            realmConfig.setDescription(description);
            if (primaryConfig == null) {
                realmConfig.setPrimary(true);
                realmConfig.setAddAdmin(addAdmin);
                realmConfig.setAdminPassword(adminPassword);
                adminRoleDomain = (String) userStoreProperties.get("DomainName");
                if (adminRoleDomain == null) {
                    userStoreProperties.put("DomainName", "PRIMARY");
                }

                int i;
                for (i = 0; i < reservedRoles.length; ++i) {
                    realmConfig.addReservedRoleName(reservedRoles[i].trim().toUpperCase());
                }

                for (i = 0; i < restrictedDomains.length; ++i) {
                    realmConfig.addRestrictedDomainForSelfSignUp(restrictedDomains[i].trim().toUpperCase());
                }

            }

            adminRoleDomain = (String) userStoreProperties.get("DomainName");
            if (adminRoleDomain == null) {
                log.warn("Required property DomainName missing in secondary user store. Skip adding the user store.");
            } else {
                userStoreProperties.put("StaticUserStore", "true");
                realmConfig.setEveryOneRoleName("Internal" + UserStoreConstants.DOMAIN_SEPARATOR + everyOneRoleName);
                realmConfig.setAdminRoleName(adminRoleName);
                realmConfig.setAdminUserName(adminUserName);
                realmConfig.setUserStoreProperties(userStoreProperties);
                realmConfig.setRealmProperties(realmProperties);
                realmConfig.setPasswordsExternallyManaged(passwordsExternallyManaged);
                realmConfig.addMultipleCredentialProperties(userStoreClass, multipleCredentialsProperties);
                if (realmConfig.getUserStoreProperty("MaxUserNameListLength") == null) {
                    realmConfig.getUserStoreProperties().put("MaxUserNameListLength", "100");
                }

                if (realmConfig.getUserStoreProperty("ReadOnly") == null) {
                    realmConfig.getUserStoreProperties().put("ReadOnly", "false");
                }

                if (primaryConfig == null) {
                    primaryConfig = realmConfig;
                } else {
                    tmpConfig.setSecondaryRealmConfig(realmConfig);
                }

                tmpConfig = realmConfig;
            }
        }

        if (primaryConfig != null && primaryConfig.isPrimary()) {
            String primaryDomainName = primaryConfig.getUserStoreProperty("DomainName");
            readOnly = primaryConfig.getUserStoreProperty("ReadOnly");
            Boolean isReadOnly = false;
            if (readOnly != null) {
                isReadOnly = Boolean.parseBoolean(readOnly);
            }

            if (primaryDomainName != null && primaryDomainName.trim().length() > 0) {
                if (adminUserName.indexOf(UserStoreConstants.DOMAIN_SEPARATOR) > 0) {
                    adminRoleDomain = adminUserName.substring(0, adminUserName.indexOf(UserStoreConstants.DOMAIN_SEPARATOR));
                    if (!primaryDomainName.equalsIgnoreCase(adminRoleDomain)) {
                        throw new UserStoreException("Admin User domain does not match primary user store domain.");
                    }
                } else {
                    primaryConfig.setAdminUserName
                            (UserStoreManagerUtils.addDomainToName(adminUserName, primaryDomainName));
                }

                if (adminRoleName.indexOf(UserStoreConstants.DOMAIN_SEPARATOR) > 0) {
                    adminRoleDomain = adminRoleName.substring(0, adminRoleName.indexOf(UserStoreConstants.DOMAIN_SEPARATOR));
                    if (!primaryDomainName.equalsIgnoreCase(adminRoleDomain) || isReadOnly && !primaryDomainName.equalsIgnoreCase("Internal")) {
                        throw new UserStoreException("Admin Role domain does not match primary user store domain.");
                    }
                }
            }

            primaryConfig.setAdminRoleName(UserStoreManagerUtils.addDomainToName(adminRoleName, primaryDomainName));
        }

        return primaryConfig;
    }

    private String constructDatabaseURL(String url) {
        if (url != null && url.contains("${carbon.home}")) {
            File carbonHomeDir = new File("");
            String path = carbonHomeDir.getPath();
            path = path.replaceAll(Pattern.quote("\\"), "/");
            if (carbonHomeDir.exists() && carbonHomeDir.isDirectory()) {
                url = url.replaceAll(Pattern.quote("${carbon.home}"), path);
            } else {
                log.warn("carbon home invalid");
                String[] tempStrings1 = url.split(Pattern.quote("${carbon.home}"));
                String dbUrl = tempStrings1[1];
                String[] tempStrings2 = dbUrl.split("/");

                for (int i = 0; i < tempStrings2.length - 1; ++i) {
                    url = tempStrings1[0] + tempStrings2[i] + "/";
                }

                url = url + tempStrings2[tempStrings2.length - 1];
            }
        }

        return url;
    }

    private Map<String, String> getChildPropertyElements(OMElement omElement, SecretResolver secretResolver) {
        Map<String, String> map = new HashMap();
        String propName;
        String propValue;
        for (Iterator ite = omElement.getChildrenWithName(new QName("Property")); ite.hasNext();
             map.put(propName.trim(), propValue.trim())) {
            OMElement propElem = (OMElement) ite.next();
            propName = propElem.getAttributeValue(new QName("name"));
            propValue = propElem.getText();
            if (secretResolver == null) {
                throw new SecureVaultException("Cannot resolve secret password because secret resolver " +
                        "is null or not initialized");
            }
            if (secretResolver.isInitialized()) {
                propValue = MiscellaneousUtil.resolve(propValue, this.secretResolver);
            }
        }

        return map;
    }

    private Map<String, String> getMultipleCredentialsProperties(OMElement omElement) {
        Map<String, String> map = new HashMap();
        OMElement multipleCredentialsEl = omElement.getFirstChildWithName(new QName("MultipleCredentials"));
        if (multipleCredentialsEl != null) {
            Iterator ite = multipleCredentialsEl.getChildrenWithLocalName("Credential");

            while (ite.hasNext()) {
                Object OMObj = ite.next();
                if (OMObj instanceof OMElement) {
                    OMElement credsElem = (OMElement) OMObj;
                    String credsType = credsElem.getAttributeValue(new QName("type"));
                    String credsClassName = credsElem.getText();
                    map.put(credsType.trim(), credsClassName.trim());
                }
            }
        }

        return map;
    }

    private OMElement getRealmElement() throws XMLStreamException, IOException, UserStoreException {
        String carbonHome = System.getProperty("dashboard.home");
        StAXOMBuilder builder = null;
        if (carbonHome != null) {
            File userMgtConfigXml = new File(System.getProperty("carbon.config.dir.path"), REALM_CONFIG_FILE);
            if (userMgtConfigXml.exists()) {
                this.inStream = new FileInputStream(userMgtConfigXml);
            } else {
                throw new FileNotFoundException(REALM_CONFIG_FILE + " not found at " +
                        "MicroIntegratorBaseUtils.getCarbonConfigDirPath()");
            }
        } else {
            log.error("Carbon Home not defined");
        }

        if (this.inStream == null) {
            String message = "Profile configuration not found.";
            if (log.isDebugEnabled()) {
                log.debug(message);
            }

            throw new FileNotFoundException(message);
        } else {
            builder = new StAXOMBuilder(this.inStream);
            OMElement documentElement = builder.getDocumentElement();
            this.setSecretResolver(documentElement);
            OMElement realmElement = documentElement.getFirstChildWithName(new QName("Realm"));
            return realmElement;
        }
    }

    public void setSecretResolver(OMElement rootElement) {
        this.secretResolver = SecretResolverFactory.create(rootElement, true);
    }

    public static RealmConfiguration createRealmConfig() throws org.wso2.micro.integrator.security.user.api.UserStoreException {
        RealmConfigXMLProcessor processor = new RealmConfigXMLProcessor();
        RealmConfiguration realmConfig;
        try {
            realmConfig = processor.buildRealmConfigurationFromFile();
        } catch (org.wso2.micro.integrator.security.user.core.UserStoreException e) {
            throw new org.wso2.micro.integrator.security.user.api.UserStoreException(
                    "Error while loading Realm Configuration from user-mgt.xml", e);
        }
        return realmConfig;
    }
}
