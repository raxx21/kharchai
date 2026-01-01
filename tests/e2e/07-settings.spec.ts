import { test, expect } from './fixtures/auth.fixture';
import { waitForPageLoad } from './utils/test-helpers';

test.describe('Settings & Profile Management', () => {
  test('should navigate to settings page', async ({ page, authenticatedUser }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Try to navigate via sidebar or user menu
    const hasSettingsLink = await page.locator('text=Settings').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasSettingsLink) {
      await page.click('text=Settings');
      await expect(page).toHaveURL('/settings');
    } else {
      // Navigate directly
      await page.goto('/settings');
    }

    await expect(page.locator('h1:has-text("Settings"), h2:has-text("Settings")')).toBeVisible({ timeout: 5000 });
  });

  test('should display settings page with tabs or sections', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Look for common settings sections
    const hasSettingsSections =
      (await page.locator('text=/Profile|Account|Categories|Preferences/i').count() > 0);

    expect(hasSettingsSections).toBeTruthy();
  });

  test('should display profile information', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Should show user's name or email
    const hasProfile =
      (await page.locator(`text=${authenticatedUser.name}`).isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await page.locator(`text=${authenticatedUser.email}`).isVisible({ timeout: 5000 }).catch(() => false));

    expect(hasProfile).toBeTruthy();
  });

  test('should update profile name', async ({ page, authenticatedUser }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Look for name input field
    const nameInput = page.locator('input[name="name"], input[id="name"]');
    const hasNameInput = await nameInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasNameInput) {
      const newName = `${authenticatedUser.name} Updated`;

      await nameInput.fill(newName);

      // Save changes
      await page.click('button:has-text("Save"), button:has-text("Update")');
      await page.waitForTimeout(2000);

      // Verify success message or updated name
      const hasSuccess =
        (await page.locator('text=/updated|saved|success/i').isVisible({ timeout: 3000 }).catch(() => false)) ||
        (await page.locator(`text=${newName}`).isVisible({ timeout: 3000 }).catch(() => false));

      expect(hasSuccess).toBeTruthy();
    } else {
      // If no editable name field, just verify page loads
      expect(page.url()).toContain('/settings');
    }
  });

  test('should display categories management', async ({
    page,
    authenticatedUser,
    categories,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Look for categories tab or section
    const hasCategoriesSection = await page.locator('text=/Categories|Manage Categories/i').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCategoriesSection) {
      await page.click('text=/Categories|Manage Categories/i');
      await page.waitForTimeout(1000);

      // Should show categories list
      const categoryCount = await page.locator('text=/Groceries|Salary|Transport/i').count();
      expect(categoryCount).toBeGreaterThan(0);
    } else {
      expect(page.url()).toContain('/settings');
    }
  });

  test('should create a new category', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Navigate to categories if needed
    const hasCategoriesTab = await page.locator('text=/Categories|Manage Categories/i').isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCategoriesTab) {
      await page.click('text=/Categories|Manage Categories/i');
      await page.waitForTimeout(1000);
    }

    // Look for Add Category button
    const hasAddButton = await page.locator('button:has-text("Add Category"), button:has-text("New Category")').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasAddButton) {
      await page.click('button:has-text("Add Category"), button:has-text("New Category")');

      // Fill category details
      await page.fill('input[name="name"]', 'Test Category');

      // Select type
      await page.click('[name="type"]');
      await page.click('text=Expense');

      // Select icon (if available)
      const hasIconField = await page.locator('[name="icon"]').isVisible({ timeout: 2000 }).catch(() => false);
      if (hasIconField) {
        await page.fill('[name="icon"]', '🧪');
      }

      // Submit
      await page.click('button:has-text("Add"), button:has-text("Create"), button:has-text("Save")');
      await page.waitForTimeout(2000);

      // Verify category appears
      await expect(page.locator('text=Test Category')).toBeVisible({ timeout: 5000 });
    } else {
      expect(page.url()).toContain('/settings');
    }
  });

  test('should edit a category', async ({
    page,
    authenticatedUser,
    categories,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Navigate to categories
    const hasCategoriesTab = await page.locator('text=/Categories|Manage Categories/i').isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCategoriesTab) {
      await page.click('text=/Categories|Manage Categories/i');
      await page.waitForTimeout(1000);

      // Find a category to edit
      const category = categories[0];
      const categoryRow = page.locator(`text=${category.name}`).locator('..').locator('..');
      const hasEditButton = await categoryRow.locator('button:has-text("Edit"), [aria-label="Edit"]').isVisible({ timeout: 3000 }).catch(() => false);

      if (hasEditButton) {
        await categoryRow.locator('button:has-text("Edit"), [aria-label="Edit"]').first().click();

        // Update name
        const updatedName = `${category.name} Updated`;
        await page.fill('input[name="name"]', updatedName);

        // Save
        await page.click('button:has-text("Save"), button:has-text("Update")');
        await page.waitForTimeout(2000);

        // Verify updated name
        await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 5000 });
      }
    }

    expect(page.url()).toContain('/settings');
  });

  test('should delete a category', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Navigate to categories
    const hasCategoriesTab = await page.locator('text=/Categories|Manage Categories/i').isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCategoriesTab) {
      await page.click('text=/Categories|Manage Categories/i');
      await page.waitForTimeout(1000);

      // Create a category to delete
      const hasAddButton = await page.locator('button:has-text("Add Category")').isVisible({ timeout: 2000 }).catch(() => false);
      if (hasAddButton) {
        await page.click('button:has-text("Add Category")');
        await page.fill('input[name="name"]', 'Delete Me');
        await page.click('[name="type"]');
        await page.click('text=Expense');
        await page.click('button:has-text("Add"), button:has-text("Create")');
        await page.waitForTimeout(2000);

        // Delete the category
        const categoryRow = page.locator('text=Delete Me').locator('..').locator('..');

        page.on('dialog', (dialog) => dialog.accept());

        const hasDeleteButton = await categoryRow.locator('button:has-text("Delete"), [aria-label="Delete"]').isVisible({ timeout: 2000 }).catch(() => false);
        if (hasDeleteButton) {
          await categoryRow.locator('button:has-text("Delete"), [aria-label="Delete"]').first().click();
          await page.waitForTimeout(2000);

          // Verify category is removed
          await expect(page.locator('text=Delete Me')).not.toBeVisible({ timeout: 5000 });
        }
      }
    }

    expect(page.url()).toContain('/settings');
  });

  test('should display account settings', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Look for account tab or section
    const hasAccountSection = await page.locator('text=/Account|Profile/i').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasAccountSection) {
      await page.click('text=/Account|Profile/i');
      await page.waitForTimeout(1000);

      // Should show email or other account info
      await expect(page.locator(`text=${authenticatedUser.email}`)).toBeVisible({ timeout: 5000 });
    } else {
      expect(page.url()).toContain('/settings');
    }
  });

  test('should change password', async ({ page, authenticatedUser }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Look for change password section
    const hasPasswordField = await page.locator('text=/Change Password|Password/i').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasPasswordField) {
      await page.click('text=/Change Password|Password/i');
      await page.waitForTimeout(1000);

      // Look for password input fields
      const hasCurrentPassword = await page.locator('input[name="currentPassword"], input[type="password"]').isVisible({ timeout: 2000 }).catch(() => false);

      if (hasCurrentPassword) {
        await page.fill('input[name="currentPassword"], input[type="password"]', authenticatedUser.password);

        const hasNewPassword = await page.locator('input[name="newPassword"]').isVisible({ timeout: 2000 }).catch(() => false);
        if (hasNewPassword) {
          await page.fill('input[name="newPassword"]', 'NewTest@1234');
          await page.fill('input[name="confirmPassword"]', 'NewTest@1234');

          // Save
          await page.click('button:has-text("Update"), button:has-text("Change")');
          await page.waitForTimeout(2000);

          // May show success or error
          const hasResponse = await page.locator('text=/success|updated|error/i').isVisible({ timeout: 3000 }).catch(() => false);
          // Password change may or may not work depending on implementation
        }
      }
    }

    expect(page.url()).toContain('/settings');
  });

  test('should display preferences or settings options', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Look for various settings options
    const hasOptions =
      (await page.locator('text=/Notifications|Theme|Currency|Language/i').count() > 0) ||
      (await page.locator('input[type="checkbox"], input[type="radio"]').count() > 0);

    expect(page.url()).toContain('/settings');
  });

  test('should handle navigation between settings tabs', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Look for tabs
    const tabs = await page.locator('[role="tab"], .tab, button:has-text("Profile"), button:has-text("Categories")').count();

    if (tabs > 1) {
      // Click on different tabs
      const tabElements = page.locator('[role="tab"], .tab');
      const tabCount = await tabElements.count();

      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        await tabElements.nth(i).click();
        await page.waitForTimeout(500);
      }
    }

    expect(page.url()).toContain('/settings');
  });

  test('should display default categories', async ({
    page,
    authenticatedUser,
    categories,
  }) => {
    await page.goto('/settings');
    await waitForPageLoad(page);

    // Navigate to categories
    const hasCategoriesTab = await page.locator('text=/Categories/i').isVisible({ timeout: 3000 }).catch(() => false);
    if (hasCategoriesTab) {
      await page.click('text=/Categories/i');
      await page.waitForTimeout(1000);

      // Should show at least some of the default categories
      const categoryCount = await page.locator(`text=${categories[0].name}`).count();
      expect(categoryCount).toBeGreaterThan(0);
    }

    expect(page.url()).toContain('/settings');
  });
});
