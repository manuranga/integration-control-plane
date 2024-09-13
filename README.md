# WSO2 Integration Control Plane

Monitor, troubleshoot and control integration deployments

## Building from the source

### Setting up the development environment

1. Install Node.js [14.X.X](https://nodejs.org/en/download/releases/).
2. Clone the [WSO2 Integration Control Plane repository](https://github.com/wso2/integration-control-plane).
5. Run the script available by doing the following Apache Maven command.
```mvn clean install```
6. wso2-integration-control-plane-<version>.zip can be found in
 `./distribution/target`.
 
### Running

- Extract the compressed archive generated to a desired location.
  `cd` to the <ICP_HOME>/bin.
  Execute dashboard.sh or dashboard.bat as appropriate.

- In a web browser, navigate to the displayed URL. i.e: https://localhost:9743//login.
