package org.wso2.icp.e2e.tests;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.wso2.icp.e2e.BaseE2ETest;
import org.wso2.icp.e2e.pages.AppPage;
import org.wso2.icp.e2e.pages.LoginPage;

import java.util.regex.Pattern;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

@Tag("e2e")
@DisplayName("Authentication and session scenarios")
class AuthenticationScenariosTest extends BaseE2ETest {

    @Test
    @DisplayName("Password login succeeds")
    void passwordLoginSucceeds() {
        LoginPage login = new LoginPage(page);
        login.open(config.baseUrl());

        login.signIn(config.adminUsername(), config.adminPassword());

        new AppPage(page).assertProjectsVisible();
    }

    @Test
    @DisplayName("Password login fails safely")
    void passwordLoginFailsSafely() {
        LoginPage login = new LoginPage(page);
        login.open(config.baseUrl());

        login.signIn(config.adminUsername(), "wrong-" + System.nanoTime());

        assertThat(page).hasURL(Pattern.compile(".*/login$"));
        login.assertVisible();
        login.assertError("incorrect username or password|sign-in failed|account temporarily locked");
    }

    @Test
    @DisplayName("Protected routes require login")
    void protectedRoutesRequireLogin() {
        open("/organizations/default");

        assertThat(page).hasURL(Pattern.compile(".*/login$"));
        new LoginPage(page).assertVisible();
    }

    @Test
    @DisplayName("Logout clears state")
    void logoutClearsState() {
        LoginPage login = new LoginPage(page);
        login.open(config.baseUrl());
        login.signIn(config.adminUsername(), config.adminPassword());
        new AppPage(page).assertProjectsVisible();

        new AppPage(page).signOut();

        assertThat(page).hasURL(Pattern.compile(".*/login$"));
        new LoginPage(page).assertVisible();
        page.navigate(config.url("/organizations/default"));
        assertThat(page).hasURL(Pattern.compile(".*/login$"));
    }

    @Test
    @DisplayName("Login page links public policy pages")
    void loginLinksPolicyPages() {
        new LoginPage(page).open(config.baseUrl());

        page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName("Privacy Policy")).click();
        assertThat(page).hasURL(Pattern.compile(".*/privacy-policy$"));
        assertThat(page.getByText("WSO2 Integration Platform - Privacy Policy", new Page.GetByTextOptions().setExact(true))).isVisible();

        page.navigate(config.url("/login"));
        page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName("Cookie Policy")).click();
        assertThat(page).hasURL(Pattern.compile(".*/cookie-policy$"));
        assertThat(page.getByText("WSO2 Integration Platform - Cookie Policy", new Page.GetByTextOptions().setExact(true))).isVisible();
    }
}
