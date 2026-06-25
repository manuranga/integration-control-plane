package org.wso2.icp.e2e.pages;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

import java.util.regex.Pattern;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

public class LoginPage {
    private final Page page;

    public LoginPage(Page page) {
        this.page = page;
    }

    public void open(String baseUrl) {
        String cleanBase = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        page.navigate(cleanBase + "/login");
        assertVisible();
    }

    public void assertVisible() {
        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("Sign In"))).isVisible();
        assertThat(page.getByLabel("Username")).isVisible();
        assertThat(password()).isVisible();
    }

    public void signIn(String username, String password) {
        page.getByLabel("Username").fill(username);
        password().fill(password);
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign In")).click();
    }

    public void assertError(String messageRegex) {
        assertThat(page.getByText(Pattern.compile(messageRegex, Pattern.CASE_INSENSITIVE))).isVisible();
    }

    private com.microsoft.playwright.Locator password() {
        return page.locator("input[name='password']");
    }
}
