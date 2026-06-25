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
@DisplayName("Navigation and inventory scenarios")
class NavigationAndInventoryScenariosTest extends BaseE2ETest {

    @Test
    @DisplayName("Main organization navigation works")
    void organizationNavigationWorks() {
        signInAsAdmin();

        page.navigate(config.url("/organizations/default/runtimes"));
        assertThat(page).hasURL(Pattern.compile(".*/organizations/default/runtimes$"));
        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName(Pattern.compile(".*Runtimes.*")))).isVisible();

        page.navigate(config.url("/organizations/default/environments"));
        assertThat(page).hasURL(Pattern.compile(".*/organizations/default/environments$"));
        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("Environments"))).isVisible();

        page.navigate(config.url("/organizations/default"));
        new AppPage(page).assertProjectsVisible();
    }

    @Test
    @DisplayName("List environments")
    void listEnvironments() {
        signInAsAdmin();
        page.navigate(config.url("/organizations/default/environments"));

        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("Environments"))).isVisible();
        assertThat(page.getByLabel("Search...")).isVisible();
        assertThat(page.getByText("Name", new Page.GetByTextOptions().setExact(true)).first()).isVisible();
        assertThat(page.getByText("Handler", new Page.GetByTextOptions().setExact(true)).first()).isVisible();
        assertThat(page.getByText("Type", new Page.GetByTextOptions().setExact(true)).first()).isVisible();

        page.getByLabel("Search...").fill("__missing_environment__");
        assertThat(page.getByText("No records to display")).isVisible();
    }

    private void signInAsAdmin() {
        LoginPage login = new LoginPage(page);
        login.open(config.baseUrl());
        login.signIn(config.adminUsername(), config.adminPassword());
        new AppPage(page).assertProjectsVisible();
    }
}
