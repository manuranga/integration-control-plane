package org.wso2.icp.e2e.tests;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.assertions.LocatorAssertions;
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
@DisplayName("Project scenarios")
class ProjectScenariosTest extends BaseE2ETest {

    @Test
    @DisplayName("List projects")
    void listProjects() {
        signInAsAdmin();
        AppPage app = new AppPage(page);
        app.assertProjectsVisible();

        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("List view")).click();
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Grid view")).click();
        page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Refresh projects")).click();

        page.getByLabel("Search projects").fill("__missing_project__");
        assertThat(page.getByLabel("Search projects")).hasValue("__missing_project__");
        page.getByLabel("Search projects").clear();
        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("All Projects"))).isVisible();
    }

    @Test
    @DisplayName("Create project validation")
    void createProjectValidation() {
        signInAsAdmin();
        page.navigate(config.url("/organizations/default/projects/new"));

        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("Create a Project"))).isVisible();
        assertThat(page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Create"))).isDisabled();

        page.getByLabel("Display Name").fill("E2E Project " + System.currentTimeMillis());

        assertThat(page.getByLabel("Name", new Page.GetByLabelOptions().setExact(true))).hasValue(Pattern.compile("e2e-project-[0-9]+"));
        assertThat(page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Create"))).isEnabled();
    }

    @Test
    @DisplayName("Not found resources are handled")
    void notFoundProjectShowsBackLink() {
        signInAsAdmin();
        page.navigate(config.url("/organizations/default/projects/__missing_project__"));

        assertThat(page.getByText("Project not found"))
                .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15_000));
        assertThat(page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName("Back to Projects"))).isVisible();
    }

    private void signInAsAdmin() {
        LoginPage login = new LoginPage(page);
        login.open(config.baseUrl());
        login.signIn(config.adminUsername(), config.adminPassword());
        new AppPage(page).assertProjectsVisible();
    }
}
