import { type Page, expect } from '@playwright/test';

export class CreateProjectPage {
  constructor(private readonly page: Page) {}

  async goto(orgHandler: string) {
    await this.page.goto(`/organizations/${orgHandler}/projects/new`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  nameInput() {
    return this.page.getByLabel('Project Name');
  }

  descriptionInput() {
    return this.page.getByLabel(/description/i);
  }

  submitButton() {
    return this.page.getByRole('button', { name: 'Create Project', exact: true });
  }

  async fillAndSubmit(name: string, description?: string) {
    await this.nameInput().fill(name);
    if (description) {
      await this.descriptionInput().fill(description);
    }
    await this.submitButton().click();
  }

  async waitForProjectCreated() {
    // On success the app navigates to the new project's home page.
    await this.page.waitForURL(/\/projects\/[^/]+\/home/, { timeout: 20_000 });
  }

  async expectOnPage() {
    await expect(this.page).toHaveURL(/\/projects\/new/);
  }
}
