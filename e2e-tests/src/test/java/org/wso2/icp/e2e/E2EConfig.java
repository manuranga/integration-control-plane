package org.wso2.icp.e2e;

public record E2EConfig(
        String baseUrl,
        String adminUsername,
        String adminPassword,
        boolean headless,
        int slowMoMs,
        int timeoutMs,
        boolean observability,
        String logsProject,
        String logsBiComponent,
        String logsMiComponent,
        boolean selfContained,
        String distributionZip,
        String miZip,
        String biJar,
        String workDir,
        String reportDir) {

    public static E2EConfig load() {
        return new E2EConfig(
                value("icp.e2e.baseUrl", "ICP_E2E_BASE_URL", "https://localhost:9445"),
                value("icp.e2e.admin.username", "ICP_E2E_ADMIN_USERNAME", "admin"),
                value("icp.e2e.admin.password", "ICP_E2E_ADMIN_PASSWORD", "admin"),
                bool("icp.e2e.headless", "ICP_E2E_HEADLESS", true),
                integer("icp.e2e.slowMoMs", "ICP_E2E_SLOW_MO_MS", 0),
                integer("icp.e2e.timeoutMs", "ICP_E2E_TIMEOUT_MS", 15_000),
                bool("icp.e2e.observability", "ICP_E2E_OBSERVABILITY", true),
                value("icp.e2e.logs.project", "ICP_E2E_LOGS_PROJECT", "sample-project"),
                value("icp.e2e.logs.biComponent", "ICP_E2E_LOGS_BI_COMPONENT", "sample-integration"),
                value("icp.e2e.logs.miComponent", "ICP_E2E_LOGS_MI_COMPONENT", "mi-sample-integration"),
                bool("icp.e2e.selfContained", "ICP_E2E_SELF_CONTAINED", false),
                value("icp.e2e.distributionZip", "ICP_E2E_DISTRIBUTION_ZIP", ""),
                value("icp.e2e.miZip", "ICP_E2E_MI_ZIP", ""),
                value("icp.e2e.biJar", "ICP_E2E_BI_JAR", ""),
                value("icp.e2e.workDir", "ICP_E2E_WORK_DIR", "build/e2e-runtime"),
                value("icp.e2e.reportDir", "ICP_E2E_REPORT_DIR", "build/reports/e2e"));
    }

    public E2EConfig withBaseUrl(String baseUrl) {
        return new E2EConfig(baseUrl, adminUsername, adminPassword, headless, slowMoMs, timeoutMs, observability,
                logsProject, logsBiComponent, logsMiComponent, selfContained, distributionZip, miZip, biJar, workDir,
                reportDir);
    }

    public String url(String path) {
        if (path == null || path.isBlank() || "/".equals(path)) return baseUrl;
        String cleanBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        String cleanPath = path.startsWith("/") ? path : "/" + path;
        return cleanBase + cleanPath;
    }

    private static String value(String property, String env, String defaultValue) {
        String propValue = System.getProperty(property);
        if (propValue != null && !propValue.isBlank()) return propValue;
        String envValue = System.getenv(env);
        return envValue == null || envValue.isBlank() ? defaultValue : envValue;
    }

    private static boolean bool(String property, String env, boolean defaultValue) {
        return Boolean.parseBoolean(value(property, env, String.valueOf(defaultValue)));
    }

    private static int integer(String property, String env, int defaultValue) {
        return Integer.parseInt(value(property, env, String.valueOf(defaultValue)));
    }
}
