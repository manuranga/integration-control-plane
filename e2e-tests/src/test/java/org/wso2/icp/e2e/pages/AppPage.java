package org.wso2.icp.e2e.pages;

import com.microsoft.playwright.Locator;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;

import java.util.regex.Pattern;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

public class AppPage {
    private final Page page;

    public AppPage(Page page) {
        this.page = page;
    }

    public void assertProjectsVisible() {
        assertThat(page).hasURL(Pattern.compile(".*/organizations/default/?$"));
        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("All Projects"))).isVisible();
        assertThat(page.getByLabel("Search projects")).isVisible();
    }

    public void signOut() {
        Locator headerButtons = page.locator("header button");
        headerButtons.nth(headerButtons.count() - 1).click();
        page.getByText("Sign Out", new Page.GetByTextOptions().setExact(true)).click();
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign Out")).last().click();
    }
}
