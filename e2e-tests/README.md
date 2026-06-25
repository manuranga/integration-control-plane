# ICP Playwright Java E2E tests

This suite is wired into the ICP Gradle build and defaults to a self-contained product fixture.

Default flow:

1. build/package the ICP distribution,
2. resolve the latest released MI zip from Maven (`-PmiVersion=` overrides it),
3. build the BI test app from `src/test/resources/bi/hello-world` using released `wso2/icp.runtime.bridge:0.1.9`,
4. unzip and start ICP from the packaged distribution with fresh H2 databases,
5. run Playwright Java tests against that product instance.

Run from `./icp`:

```bash
./gradlew :e2e-tests:test
./gradlew check
```

Useful properties:

```bash
./gradlew :e2e-tests:test \
  -PmiVersion=4.6.0 \
  -Dicp.e2e.headless=false \
  -Dicp.e2e.timeoutMs=30000
```

To run against an already running ICP instead of the self-contained fixture:

```bash
./gradlew :e2e-tests:test \
  -Dicp.e2e.selfContained=false \
  -Dicp.e2e.baseUrl=https://localhost:9445
```

The non-observability tests cover login, failed login, protected-route redirect, logout, public policy pages, project listing, environment listing, project validation, and not-found resources.

Runtime log scenarios still require `-Dicp.e2e.observability=true`. They are retained from the lab-backed suite while the remaining self-contained OpenSearch/Fluent Bit/MI/BI orchestration is completed.
