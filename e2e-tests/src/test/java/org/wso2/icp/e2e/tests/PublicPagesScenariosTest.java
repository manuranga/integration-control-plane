package org.wso2.icp.e2e.tests;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.options.AriaRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.wso2.icp.e2e.BaseE2ETest;

import java.util.regex.Pattern;

import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

@Tag("e2e")
@DisplayName("Public page scenarios")
class PublicPagesScenariosTest extends BaseE2ETest {

    @Test
    @DisplayName("Policy pages are public")
    void policyPagesArePublic() {
        open("/privacy-policy");
        assertThat(page).hasURL(Pattern.compile(".*/privacy-policy$"));
        assertThat(page.getByText("WSO2 Integration Platform - Privacy Policy", new Page.GetByTextOptions().setExact(true))).isVisible();
        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("Sign In"))).not().isVisible();

        open("/cookie-policy");
        assertThat(page).hasURL(Pattern.compile(".*/cookie-policy$"));
        assertThat(page.getByText("WSO2 Integration Platform - Cookie Policy", new Page.GetByTextOptions().setExact(true))).isVisible();
        assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("Sign In"))).not().isVisible();
    }
}
