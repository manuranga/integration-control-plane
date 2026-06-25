package org.wso2.icp.e2e;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;

public abstract class BaseE2ETest {
    protected static E2EConfig config;
    private static Playwright playwright;
    private static Browser browser;

    protected BrowserContext context;
    protected Page page;

    @BeforeAll
    static void startBrowser() {
        config = E2EEnvironment.start(E2EConfig.load());
        playwright = Playwright.create();
        browser = playwright.chromium().launch(new BrowserType.LaunchOptions()
                .setHeadless(config.headless())
                .setSlowMo(config.slowMoMs()));
    }

    @BeforeEach
    void createContext() {
        context = browser.newContext(new Browser.NewContextOptions()
                .setIgnoreHTTPSErrors(true)
                .setViewportSize(1440, 900));
        page = context.newPage();
        page.setDefaultTimeout(config.timeoutMs());
    }

    @AfterEach
    void closeContext() {
        if (context != null) context.close();
    }

    // The shared ICP environment is started once and torn down by a JVM shutdown hook,
    // so it is not stopped here per test class.
    @AfterAll
    static void stopBrowser() {
        if (browser != null) browser.close();
        if (playwright != null) playwright.close();
    }

    protected void open(String path) {
        page.navigate(config.url(path));
    }
}
