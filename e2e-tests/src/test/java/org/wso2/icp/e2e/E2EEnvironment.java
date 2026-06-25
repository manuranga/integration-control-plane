package org.wso2.icp.e2e;

import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import java.net.HttpURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.io.IOException;
import java.io.InputStream;
import java.net.ServerSocket;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import java.util.regex.Matcher;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

public final class E2EEnvironment implements AutoCloseable {
    private static E2EEnvironment current;

    private final Path runDir;
    private final Path reportDir;
    private final Path icpHome;
    private final Path miZip;
    private final Path biJar;
    private final Ports ports;
    private final boolean observability;
    private final List<String> dockerIds = new ArrayList<>();
    private final List<Process> runtimeProcesses = new ArrayList<>();
    private Process icpProcess;
    private boolean fluentBitStarted;
    private String fluentBitId;

    private E2EEnvironment(Path runDir, Path reportDir, Path icpHome, Path miZip, Path biJar, Ports ports,
                           boolean observability) {
        this.runDir = runDir;
        this.reportDir = reportDir;
        this.icpHome = icpHome;
        this.miZip = miZip;
        this.biJar = biJar;
        this.ports = ports;
        this.observability = observability;
    }

    public static synchronized E2EConfig start(E2EConfig config) {
        if (!config.selfContained()) return config;
        if (current != null) return config.withBaseUrl(current.baseUrl());
        if (config.distributionZip().isBlank()) {
            throw new IllegalStateException("icp.e2e.distributionZip is required for self-contained E2E tests");
        }

        try {
            trustAllHttpsCertificates();
            Path runDir = Path.of(config.workDir()).toAbsolutePath().resolve("run-" + UUID.randomUUID());
            Path reportDir = Path.of(config.reportDir()).toAbsolutePath();
            recreate(runDir);
            Files.createDirectories(reportDir);

            Path icpHome = unzipRoot(Path.of(config.distributionZip()).toAbsolutePath(), runDir.resolve("icp"),
                    "wso2-integration-control-plane-");
            Path miZip = config.miZip().isBlank() ? null : Path.of(config.miZip()).toAbsolutePath();
            Path biJar = config.biJar().isBlank() ? null : Path.of(config.biJar()).toAbsolutePath();
            Ports ports = Ports.allocate();
            E2EEnvironment environment = new E2EEnvironment(runDir, reportDir, icpHome, miZip, biJar, ports,
                    config.observability());
            environment.startObservability();
            environment.prepareIcp();
            environment.startIcp();
            current = environment;
            Runtime.getRuntime().addShutdownHook(new Thread(environment::closeQuietly));
            return config.withBaseUrl(environment.baseUrl());
        } catch (Exception e) {
            throw new RuntimeException("Failed to start self-contained ICP E2E environment", e);
        }
    }

    // Release the heavy per-scenario runtimes (BI/MI/Fluent Bit) while keeping the shared
    // ICP and OpenSearch, so memory is freed for the remaining UI tests.
    public static synchronized void stopRuntimes() {
        if (current == null) return;
        current.runtimeProcesses.reversed().forEach(E2EEnvironment::destroyTree);
        current.runtimeProcesses.clear();
        current.removeFluentBit();
    }

    private void removeFluentBit() {
        if (fluentBitId == null) return;
        try {
            output(new ProcessBuilder("docker", "rm", "-f", fluentBitId), Duration.ofSeconds(20), "remove Fluent Bit");
        } catch (Exception ignored) {
        }
        dockerIds.remove(fluentBitId);
        fluentBitId = null;
        fluentBitStarted = false;
    }

    private String baseUrl() {
        return "https://localhost:" + ports.icp;
    }

    public static String runtimeListenerUrl() {
        if (current == null) throw new IllegalStateException("E2E environment is not running");
        return "https://localhost:" + current.ports.runtimeListener;
    }

    public static RuntimeProcess startBiRuntime(String runtimeId, String environment, String project, String component,
                                                String secret) throws Exception {
        if (current == null) throw new IllegalStateException("E2E environment is not running");
        return current.startBi(runtimeId, environment, project, component, secret);
    }

    public static RuntimeProcess startMiRuntime(String runtimeId, String environment, String project, String component,
                                                String secret, String logMessage) throws Exception {
        if (current == null) throw new IllegalStateException("E2E environment is not running");
        return current.startMi(runtimeId, environment, project, component, secret, logMessage);
    }

    public static void get(String url) throws Exception {
        waitForUrl(url, Duration.ofSeconds(30));
    }

    public static void startLogCollector() throws Exception {
        if (current == null) throw new IllegalStateException("E2E environment is not running");
        current.startFluentBit();
    }

    private void prepareIcp() throws Exception {
        Files.createDirectories(icpHome.resolve("bin/database"));
        Files.createDirectories(icpHome.resolve("logs"));
        Files.createDirectories(runDir.resolve("logs/bi/e2e-bi"));
        Files.createDirectories(runDir.resolve("logs/mi"));
        initializeH2("icp_db", icpHome.resolve("dbscripts/h2_init.sql"));
        initializeH2("credentials_db", icpHome.resolve("dbscripts/credentials_h2_init.sql"));
        writeDeploymentToml();
    }

    private static final String DOCKER_LABEL = "icp-e2e=true";

    private void startObservability() throws Exception {
        if (!observability) return;
        requireDocker();
        removeLabeledContainers();
        String id = dockerId(new ProcessBuilder(
                "docker", "run", "--rm", "-d",
                "--label", DOCKER_LABEL,
                "-p", ports.opensearch + ":9200",
                "-e", "discovery.type=single-node",
                "-e", "bootstrap.memory_lock=true",
                "-e", "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g",
                "-e", "OPENSEARCH_INITIAL_ADMIN_PASSWORD=Ballerina@123",
                "opensearchproject/opensearch:2.19.1"), Duration.ofSeconds(30), "start OpenSearch");
        dockerIds.add(id);
        waitForOpenSearch();
        applyOpenSearchIndexTemplate();
    }

    private void startFluentBit() throws Exception {
        if (!observability || fluentBitStarted) return;
        Path conf = runDir.resolve("fluent-bit.conf");
        Path parsers = runDir.resolve("parsers.conf");
        Path scripts = runDir.resolve("scripts.lua");
        Files.writeString(parsers, resource("observability/parsers.conf"));
        Files.writeString(scripts, resource("observability/scripts.lua"));
        Files.writeString(conf, render("observability/fluent-bit.conf",
                Map.of("OPENSEARCH_PORT", Integer.toString(ports.opensearch))));
        String id = dockerId(new ProcessBuilder(
                "docker", "run", "--rm", "-d",
                "--label", DOCKER_LABEL,
                "--add-host", "host.docker.internal:host-gateway",
                "-v", conf + ":/fluent-bit/etc/fluent-bit.conf:ro",
                "-v", parsers + ":/fluent-bit/etc/parsers.conf:ro",
                "-v", scripts + ":/fluent-bit/etc/scripts.lua:ro",
                "-v", runDir.resolve("logs/bi") + ":/var/log/ballerina:ro",
                "-v", runDir + ":/e2e:ro",
                "fluent/fluent-bit:latest"), Duration.ofSeconds(30), "start Fluent Bit");
        dockerIds.add(id);
        fluentBitId = id;
        fluentBitStarted = true;
    }

    public static void captureDiagnostics(String label) {
        if (current == null || !current.observability) return;
        current.dumpDiagnostics(label);
    }

    private void dumpDiagnostics(String label) {
        StringBuilder out = new StringBuilder("=== observability diagnostics: " + label + " ===\n");
        try {
            out.append("\n--- OpenSearch _cat/indices ---\n")
                    .append(openSearchText("/_cat/indices?v", "GET", null));
            String search = "{\"size\":20,\"sort\":[{\"@timestamp\":\"desc\"}],\"query\":{\"match_all\":{}}}";
            out.append("\n--- mi-application-logs-*/_search ---\n")
                    .append(openSearchText("/mi-application-logs-*/_search", "POST", search));
            out.append("\n--- ballerina-application-logs-*/_search ---\n")
                    .append(openSearchText("/ballerina-application-logs-*/_search", "POST", search));
        } catch (Exception e) {
            out.append("\nOpenSearch query failed: ").append(e).append('\n');
        }
        if (fluentBitId != null) {
            try {
                out.append("\n--- fluent-bit logs ---\n")
                        .append(output(new ProcessBuilder("docker", "logs", fluentBitId),
                                Duration.ofSeconds(20), "fluent-bit logs"));
            } catch (Exception e) {
                out.append("\nfluent-bit logs failed: ").append(e).append('\n');
            }
        }
        try {
            Files.writeString(reportDir.resolve("observability-diagnostics.log"), out.toString());
        } catch (IOException ignored) {
        }
        System.out.println(out);
    }

    private String openSearchText(String path, String method, String body) throws IOException {
        HttpsURLConnection connection = openSearchConnection(path, method);
        if (body != null) {
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setDoOutput(true);
            connection.getOutputStream().write(body.getBytes(StandardCharsets.UTF_8));
        }
        int code = connection.getResponseCode();
        java.io.InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
        String text = stream == null ? "" : new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        return code + "\n" + text + "\n";
    }

    private RuntimeProcess startBi(String runtimeId, String environment, String project, String component, String secret)
            throws Exception {
        if (biJar == null || !Files.exists(biJar)) throw new IllegalStateException("icp.e2e.biJar is required");
        int port = freePort();
        Path home = runDir.resolve("bi-runtime");
        recreate(home);
        Files.createDirectories(runDir.resolve("logs/bi/e2e-bi"));
        Files.writeString(home.resolve(".icp_runtime_id"), runtimeId);
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("HTTP_PORT", Integer.toString(port));
        vars.put("RUNTIME_ID", escapeToml(runtimeId));
        vars.put("SERVER_URL", runtimeListenerUrl());
        vars.put("SECRET", escapeToml(secret));
        vars.put("INTEGRATION", escapeToml(component));
        vars.put("PROJECT", escapeToml(project));
        vars.put("ENVIRONMENT", escapeToml(environment));
        vars.put("LOG_PATH", escapeToml(runDir.resolve("logs/bi/e2e-bi/app.log").toString()));
        Files.writeString(home.resolve("Config.toml"), render("bi/Config.toml", vars));

        Process process = new ProcessBuilder(javaBin(), "-jar", biJar.toString())
                .directory(home.toFile())
                .redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.appendTo(reportDir.resolve("bi-stdout.log").toFile()))
                .start();
        runtimeProcesses.add(process);
        String url = "http://localhost:" + port + "/greeting";
        waitForUrl(url, Duration.ofSeconds(90));
        return new RuntimeProcess("BI", runtimeId, url);
    }

    private RuntimeProcess startMi(String runtimeId, String environment, String project, String component, String secret,
                                   String logMessage) throws Exception {
        if (miZip == null || !Files.exists(miZip)) throw new IllegalStateException("icp.e2e.miZip is required");
        int httpPort = freePort();
        int httpsPort = freePort();
        Path miHome = unzipRoot(miZip, runDir.resolve("mi-runtime"));
        Files.createDirectories(miHome.resolve("repository/deployment/server/synapse-configs/default/api"));
        Files.writeString(miHome.resolve(".icp_runtime_id"), runtimeId);
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("HTTP_PORT", Integer.toString(httpPort));
        vars.put("HTTPS_PORT", Integer.toString(httpsPort));
        vars.put("ICP_URL", runtimeListenerUrl());
        vars.put("ENVIRONMENT", escapeToml(environment));
        vars.put("PROJECT", escapeToml(project));
        vars.put("INTEGRATION", escapeToml(component));
        vars.put("SECRET", escapeToml(secret));
        Files.writeString(miHome.resolve("conf/deployment.toml"), render("mi/deployment.toml", vars));
        patchMiLog4j(miHome.resolve("conf/log4j2.properties"));
        String api = render("mi/e2e-log-api.xml.template", Map.of("MESSAGE", xmlEscape(logMessage)));
        Files.writeString(miHome.resolve("repository/deployment/server/synapse-configs/default/api/e2e-log-api.xml"), api);

        ProcessBuilder builder = new ProcessBuilder("./micro-integrator.sh");
        builder.directory(miHome.resolve("bin").toFile());
        builder.redirectErrorStream(true);
        builder.redirectOutput(ProcessBuilder.Redirect.appendTo(reportDir.resolve("mi-stdout.log").toFile()));
        Map<String, String> env = builder.environment();
        env.put("JAVA_OPTS", "-Xms256m -Xmx768m");
        Process process = builder.start();
        runtimeProcesses.add(process);
        String url = "http://localhost:" + httpPort + "/e2e/log";
        waitForUrl(url, Duration.ofSeconds(180));
        return new RuntimeProcess("MI", runtimeId, url);
    }

    // Mirror the real ICP+MI deployment: emit timezone-aware ISO timestamps and append the
    // icp.runtime.log.suffix system property (set by MI from .icp_runtime_id). Without the
    // timezone the carbon log times are parsed as UTC and land in the future, outside the UI
    // time window, so the logs never appear.
    private static void patchMiLog4j(Path log4j) throws IOException {
        String content = Files.readString(log4j);
        content = content.replaceAll(
                "(?m)^appender\\.CARBON_LOGFILE\\.layout\\.pattern\\s*=.*$",
                Matcher.quoteReplacement(
                        "appender.CARBON_LOGFILE.layout.pattern = [%d{yyyy-MM-dd'T'HH:mm:ss.SSSXXX}] %5p {%c} %X{Artifact-Container} - %m%ex ${sys:icp.runtime.log.suffix:-}%n"));
        Files.writeString(log4j, content);
    }

    private void initializeH2(String dbName, Path script) throws Exception {
        output(new ProcessBuilder(
                javaBin(),
                "-cp", icpHome.resolve("bin/icp-server.jar").toString(),
                "org.h2.tools.RunScript",
                "-url", "jdbc:h2:file:" + icpHome.resolve("bin/database").resolve(dbName) + ";MODE=MySQL",
                "-user", "icp_user",
                "-password", "icp_password",
                "-script", script.toString()
        ).directory(icpHome.resolve("bin").toFile()), Duration.ofSeconds(60), "initialize " + dbName);
    }

    private void writeDeploymentToml() throws IOException {
        String opensearch = observability
                ? "opensearchUrl = \"https://localhost:" + ports.opensearch + "\"\n"
                + "opensearchUsername = \"admin\"\nopensearchPassword = \"Ballerina@123\""
                : "";
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("SERVER_PORT", Integer.toString(ports.icp));
        vars.put("AUTH_PORT", Integer.toString(ports.auth));
        vars.put("OPENSEARCH_ADAPTOR_PORT", Integer.toString(ports.opensearchAdaptor));
        vars.put("RUNTIME_LISTENER_PORT", Integer.toString(ports.runtimeListener));
        vars.put("ICP_PORT", Integer.toString(ports.icp));
        vars.put("OPENSEARCH", opensearch);
        Files.writeString(icpHome.resolve("conf/deployment.toml"), render("icp/deployment.toml", vars));
    }

    private void startIcp() throws Exception {
        Path log = reportDir.resolve("icp-stdout.log");
        icpProcess = new ProcessBuilder("./icp.sh", "run")
                .directory(icpHome.resolve("bin").toFile())
                .redirectErrorStream(true)
                .redirectOutput(ProcessBuilder.Redirect.appendTo(log.toFile()))
                .start();

        try {
            waitForUrl(baseUrl() + "/login", Duration.ofSeconds(120));
        } catch (Exception e) {
            closeQuietly();
            throw new RuntimeException("ICP did not become ready. See " + log, e);
        }
    }

    private static void waitForUrl(String url, Duration timeout) throws Exception {
        Instant deadline = Instant.now().plus(timeout);
        Exception last = null;
        while (Instant.now().isBefore(deadline)) {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setConnectTimeout(2_000);
                connection.setReadTimeout(2_000);
                connection.setRequestMethod("GET");
                int code = connection.getResponseCode();
                if (code >= 200 && code < 500) return;
            } catch (Exception e) {
                last = e;
            }
            Thread.sleep(1_000);
        }
        throw new RuntimeException("Timed out waiting for " + url, last);
    }

    private static Path unzipRoot(Path zip, Path target) throws IOException {
        return unzipRoot(zip, target, "");
    }

    private static Path unzipRoot(Path zip, Path target, String rootPrefix) throws IOException {
        Files.createDirectories(target);
        try (ZipInputStream stream = new ZipInputStream(Files.newInputStream(zip))) {
            ZipEntry entry;
            while ((entry = stream.getNextEntry()) != null) {
                Path output = target.resolve(entry.getName()).normalize();
                if (!output.startsWith(target)) throw new IOException("Unsafe zip entry: " + entry.getName());
                if (entry.isDirectory()) {
                    Files.createDirectories(output);
                } else {
                    Files.createDirectories(output.getParent());
                    Files.copy(stream, output);
                    if (output.getFileName().toString().endsWith(".sh")) output.toFile().setExecutable(true);
                }
            }
        }
        try (Stream<Path> children = Files.list(target)) {
            return children.filter(Files::isDirectory)
                    .filter(path -> rootPrefix.isEmpty() || path.getFileName().toString().startsWith(rootPrefix))
                    .findFirst()
                    .orElseThrow(() -> new IOException("Distribution root not found in " + zip));
        }
    }

    private static void recreate(Path path) throws IOException {
        if (Files.exists(path)) delete(path);
        Files.createDirectories(path);
    }

    private static void delete(Path path) throws IOException {
        try (Stream<Path> paths = Files.walk(path)) {
            paths.sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });
        }
    }

    private static String output(ProcessBuilder builder, Duration timeout, String name) throws Exception {
        Process process = builder.redirectErrorStream(true).start();
        byte[] bytes = process.getInputStream().readAllBytes();
        if (!process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS)) {
            process.destroyForcibly();
            throw new RuntimeException(name + " timed out");
        }
        String out = new String(bytes, StandardCharsets.UTF_8).trim();
        if (process.exitValue() != 0) {
            throw new RuntimeException(name + " failed with exit code " + process.exitValue() + ": " + out);
        }
        return out;
    }

    private static String dockerId(ProcessBuilder builder, Duration timeout, String name) throws Exception {
        return output(builder, timeout, name).lines().findFirst().orElseThrow();
    }

    private static void requireDocker() throws Exception {
        output(new ProcessBuilder("docker", "version", "--format", "{{.Server.Version}}"), Duration.ofSeconds(10), "check Docker");
    }

    // Remove containers orphaned by a previously killed run so they cannot accumulate.
    private static void removeLabeledContainers() {
        try {
            String ids = output(new ProcessBuilder("docker", "ps", "-aq", "--filter", "label=" + DOCKER_LABEL),
                    Duration.ofSeconds(15), "list E2E containers");
            for (String id : ids.lines().filter(line -> !line.isBlank()).toList()) {
                output(new ProcessBuilder("docker", "rm", "-f", id), Duration.ofSeconds(20), "remove orphan " + id);
            }
        } catch (Exception ignored) {
        }
    }

    private void waitForOpenSearch() throws Exception {
        Instant deadline = Instant.now().plus(Duration.ofMinutes(3));
        Exception last = null;
        while (Instant.now().isBefore(deadline)) {
            try {
                HttpsURLConnection connection = openSearchConnection("/_cluster/health?wait_for_status=yellow&timeout=5s", "GET");
                if (connection.getResponseCode() >= 200 && connection.getResponseCode() < 300) return;
            } catch (Exception e) {
                last = e;
            }
            Thread.sleep(2_000);
        }
        throw new RuntimeException("Timed out waiting for OpenSearch", last);
    }

    private void applyOpenSearchIndexTemplate() throws IOException {
        String template = resource("observability/index-template.json");
        HttpsURLConnection connection = openSearchConnection("/_index_template/icp-e2e-runtime-logs", "PUT");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setDoOutput(true);
        connection.getOutputStream().write(template.getBytes(StandardCharsets.UTF_8));
        int code = connection.getResponseCode();
        if (code < 200 || code >= 300) {
            String error = connection.getErrorStream() == null ? "" : new String(connection.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
            throw new IOException("Failed to apply OpenSearch index template: " + code + " " + error);
        }
    }

    private HttpsURLConnection openSearchConnection(String path, String method) throws IOException {
        HttpsURLConnection connection = (HttpsURLConnection) new URL("https://localhost:" + ports.opensearch + path).openConnection();
        String basic = Base64.getEncoder().encodeToString("admin:Ballerina@123".getBytes(StandardCharsets.UTF_8));
        connection.setRequestProperty("Authorization", "Basic " + basic);
        connection.setConnectTimeout(2_000);
        connection.setReadTimeout(7_000);
        connection.setRequestMethod(method);
        return connection;
    }

    private static String escapeToml(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String resource(String path) throws IOException {
        try (InputStream in = E2EEnvironment.class.getResourceAsStream("/" + path)) {
            if (in == null) throw new IOException("Missing test resource: " + path);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String render(String path, Map<String, String> vars) throws IOException {
        String text = resource(path);
        for (Map.Entry<String, String> entry : vars.entrySet()) {
            text = text.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return text;
    }

    private static String xmlEscape(String value) {
        return value.replace("&", "&amp;")
                .replace("\"", "&quot;")
                .replace("<", "&lt;")
                .replace(">", "&gt;");
    }

    private static String javaBin() {
        String javaHome = System.getProperty("java.home");
        return Path.of(javaHome, "bin", "java").toString();
    }

    private static int freePort() throws IOException {
        try (ServerSocket socket = new ServerSocket(0)) {
            socket.setReuseAddress(true);
            return socket.getLocalPort();
        }
    }

    private static void trustAllHttpsCertificates() throws Exception {
        TrustManager[] trustManagers = new TrustManager[]{new X509TrustManager() {
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            public void checkClientTrusted(X509Certificate[] chain, String authType) { }
            public void checkServerTrusted(X509Certificate[] chain, String authType) { }
        }};
        SSLContext context = SSLContext.getInstance("TLS");
        context.init(null, trustManagers, new SecureRandom());
        HttpsURLConnection.setDefaultSSLSocketFactory(context.getSocketFactory());
        HostnameVerifier verifier = (hostname, session) -> true;
        HttpsURLConnection.setDefaultHostnameVerifier(verifier);
    }

    private void closeQuietly() {
        try {
            close();
        } catch (Exception ignored) {
        }
    }

    @Override
    public void close() {
        runtimeProcesses.reversed().forEach(E2EEnvironment::destroyTree);
        runtimeProcesses.clear();
        if (icpProcess != null) destroyTree(icpProcess);
        for (String id : dockerIds.reversed()) {
            try {
                output(new ProcessBuilder("docker", "rm", "-f", id), Duration.ofSeconds(20), "remove container " + id);
            } catch (Exception ignored) {
            }
        }
        dockerIds.clear();
    }

    private static void destroyTree(Process process) {
        process.descendants().forEach(ProcessHandle::destroy);
        process.destroy();
        try {
            if (!process.waitFor(10, TimeUnit.SECONDS)) {
                process.descendants().forEach(ProcessHandle::destroyForcibly);
                process.destroyForcibly();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
        }
    }

    public record RuntimeProcess(String type, String runtimeId, String url) {
    }

    private record Ports(int icp, int auth, int runtimeListener, int opensearchAdaptor, int opensearch) {
        static Ports allocate() throws IOException {
            return new Ports(freePort(), freePort(), freePort(), freePort(), freePort());
        }
    }
}
