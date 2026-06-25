import ballerina/http;
import ballerina/log;
import wso2/icp.runtime.bridge as _;
import ballerinax/metrics.logs as _;

configurable int httpPort = 9090;
configurable string e2eRuntimeId = "";

listener http:Listener e2eListener = new (httpPort);

service / on e2eListener {

    resource function get greeting() returns string {
        log:printInfo("E2E BI application log " + e2eRuntimeId,
            icp_runtimeId = e2eRuntimeId,
            service_type = "BI",
            product = "ballerina integrator");
        return "Hello, World!";
    }
}
