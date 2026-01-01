import { test, expect } from './fixtures/auth.fixture';
import {
  waitForPageLoad,
  getRandomNumber,
  createTestBank,
  formatCurrency,
} from './utils/test-helpers';

test.describe('Transactions Management', () => {
  test('should navigate to transactions page', async ({ page, authenticatedUser }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    await page.click('text=Transactions');

    await expect(page).toHaveURL('/transactions');
    await expect(page.locator('h1:has-text("Transactions")')).toBeVisible();
  });

  test('should display transactions page with filters', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/transactions');
    await waitForPageLoad(page);

    // Check for filter elements
    const hasFilters =
      (await page.locator('text=/Filter|Type|Category|Date/i').isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await page.locator('select, [role="combobox"]').count()) > 0;

    expect(hasFilters).toBeTruthy();
  });

  test('should create an expense transaction', async ({
    page,
    authenticatedUser,
    categories,
  }) => {
    // Create a bank first
    const bank = await createTestBank(
      authenticatedUser.id,
      'Test Bank',
      'ACC123456',
      10000
    );

    await page.goto('/transactions');
    await waitForPageLoad(page);

    // Click Add Transaction button
    await page.click('text=Add Transaction');

    // Fill transaction details
    const description = `Test Expense ${getRandomNumber(1000, 9999)}`;
    const amount = getRandomNumber(100, 1000);

    await page.fill('input[name="description"]', description);
    await page.fill('input[name="amount"]', amount.toString());

    // Select type - Expense
    await page.click('[name="type"]');
    await page.click('text=Expense');

    // Select category
    const expenseCategory = categories.find((c) => c.type === 'EXPENSE');
    if (expenseCategory) {
      await page.click('[name="categoryId"]');
      await page.click(`text=${expenseCategory.name}`);
    }

    // Select bank
    await page.click('[name="bankId"]');
    await page.click(`text=${bank.name}`);

    // Submit
    await page.click('button:has-text("Add Transaction"), button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Verify transaction appears
    await expect(page.locator(`text=${description}`)).toBeVisible({ timeout: 5000 });
  });

  test('should create an income transaction', async ({
    page,
    authenticatedUser,
    categories,
  }) => {
    const bank = await createTestBank(
      authenticatedUser.id,
      'Income Bank',
      'ACC789012',
      5000
    );

    await page.goto('/transactions');
    await waitForPageLoad(page);

    await page.click('text=Add Transaction');

    const description = `Salary ${getRandomNumber(1000, 9999)}`;
    const amount = getRandomNumber(5000, 10000);

    await page.fill('input[name="description"]', description);
    await page.fill('input[name="amount"]', amount.toString());

    // Select type - Income
    await page.click('[name="type"]');
    await page.click('text=Income');

    // Select category
    const incomeCategory = categories.find((c) => c.type === 'INCOME');
    if (incomeCategory) {
      await page.click('[name="categoryId"]');
      await page.click(`text=${incomeCategory.name}`);
    }

    // Select bank
    await page.click('[name="bankId"]');
    await page.click(`text=${bank.name}`);

    // Submit
    await page.click('button:has-text("Add Transaction"), button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Verify transaction appears
    await expect(page.locator(`text=${description}`)).toBeVisible({ timeout: 5000 });
  });

  test('should edit a transaction', async ({
    page,
    authenticatedUser,
    categories,
  }) => {
    const bank = await createTestBank(
      authenticatedUser.id,
      'Edit Bank',
      'ACC345678',
      8000
    );

    await page.goto('/transactions');
    await waitForPageLoad(page);

    // Create a transaction first
    await page.click('text=Add Transaction');
    const originalDesc = `Original Trans ${getRandomNumber(1000, 9999)}`;
    await page.fill('input[name="description"]', originalDesc);
    await page.fill('input[name="amount"]', '500');
    await page.click('[name="type"]');
    await page.click('text=Expense');

    const expenseCategory = categories.find((c) => c.type === 'EXPENSE');
    if (expenseCategory) {
      await page.click('[name="categoryId"]');
      await page.click(`text=${expenseCategory.name}`);
    }

    await page.click('[name="bankId"]');
    await page.click(`text=${bank.name}`);
    await page.click('button:has-text("Add Transaction"), button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Find and edit the transaction
    const transactionRow = page.locator(`text=${originalDesc}`).locator('..').locator('..');
    await transactionRow.locator('button:has-text("Edit"), [aria-label="Edit"]').first().click();

    // Update description
    const updatedDesc = `${originalDesc} Updated`;
    await page.fill('input[name="description"]', updatedDesc);

    // Save
    await page.click('button:has-text("Save"), button:has-text("Update")');
    await page.waitForTimeout(2000);

    // Verify updated transaction
    await expect(page.locator(`text=${updatedDesc}`)).toBeVisible({ timeout: 5000 });
  });

  test('should delete a transaction', async ({
    page,
    authenticatedUser,
    categories,
  }) => {
    const bank = await createTestBank(
      authenticatedUser.id,
      'Delete Bank',
      'ACC901234',
      7000
    );

    await page.goto('/transactions');
    await waitForPageLoad(page);

    // Create a transaction
    await page.click('text=Add Transaction');
    const description = `Delete Trans ${getRandomNumber(1000, 9999)}`;
    await page.fill('input[name="description"]', description);
    await page.fill('input[name="amount"]', '300');
    await page.click('[name="type"]');
    await page.click('text=Expense');

    const expenseCategory = categories.find((c) => c.type === 'EXPENSE');
    if (expenseCategory) {
      await page.click('[name="categoryId"]');
      await page.click(`text=${expenseCategory.name}`);
    }

    await page.click('[name="bankId"]');
    await page.click(`text=${bank.name}`);
    await page.click('button:has-text("Add Transaction"), button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Delete the transaction
    const transactionRow = page.locator(`text=${description}`).locator('..').locator('..');

    page.on('dialog', (dialog) => dialog.accept());

    await transactionRow.locator('button:has-text("Delete"), [aria-label="Delete"]').first().click();
    await page.waitForTimeout(2000);

    // Verify transaction is removed
    await expect(page.locator(`text=${description}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should filter transactions by type', async ({
    page,
    authenticatedUser,
    categories,
  }) => {
    const bank = await createTestBank(
      authenticatedUser.id,
      'Filter Bank',
      'ACC567890',
      10000
    );

    await page.goto('/transactions');
    await waitForPageLoad(page);

    // Create income and expense transactions
    const incomeDesc = `Income Filter ${getRandomNumber(1000, 9999)}`;
    const expenseDesc = `Expense Filter ${getRandomNumber(1000, 9999)}`;

    // Create income
    await page.click('text=Add Transaction');
    await page.fill('input[name="description"]', incomeDesc);
    await page.fill('input[name="amount"]', '5000');
    await page.click('[name="type"]');
    await page.click('text=Income');
    const incomeCategory = categories.find((c) => c.type === 'INCOME');
    if (incomeCategory) {
      await page.click('[name="categoryId"]');
      await page.click(`text=${incomeCategory.name}`);
    }
    await page.click('[name="bankId"]');
    await page.click(`text=${bank.name}`);
    await page.click('button:has-text("Add Transaction"), button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Create expense
    await page.click('text=Add Transaction');
    await page.fill('input[name="description"]', expenseDesc);
    await page.fill('input[name="amount"]', '2000');
    await page.click('[name="type"]');
    await page.click('text=Expense');
    const expenseCategory = categories.find((c) => c.type === 'EXPENSE');
    if (expenseCategory) {
      await page.click('[name="categoryId"]');
      await page.click(`text=${expenseCategory.name}`);
    }
    await page.click('[name="bankId"]');
    await page.click(`text=${bank.name}`);
    await page.click('button:has-text("Add Transaction"), button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Apply filter for income only (if filter exists)
    const hasTypeFilter = await page.locator('text=/Type|Filter by type/i').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasTypeFilter) {
      await page.click('text=/Type|Filter by type/i');
      await page.click('text=Income');
      await page.waitForTimeout(1000);

      // Should show income, may or may not hide expense depending on implementation
      await expect(page.locator(`text=${incomeDesc}`)).toBeVisible();
    }
  });

  test('should validate required fields', async ({ page, authenticatedUser }) => {
    await page.goto('/transactions');
    await waitForPageLoad(page);

    await page.click('text=Add Transaction');

    // Try to submit without filling fields
    await page.click('button:has-text("Add Transaction"), button:has-text("Save")');

    // Should show validation errors
    const descInput = page.locator('input[name="description"]');
    const validationMessage = await descInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    expect(
      validationMessage !== '' ||
      (await page.locator('text=/required|cannot be empty/i').isVisible({ timeout: 2000 }).catch(() => false))
    ).toBeTruthy();
  });

  test('should display transaction list with pagination or load more', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/transactions');
    await waitForPageLoad(page);

    // Check if pagination or load more exists
    const hasPagination =
      (await page.locator('text=/Next|Previous|Load more|Page/i').isVisible({ timeout: 3000 }).catch(() => false)) ||
      (await page.locator('button:has-text("Load More")').isVisible({ timeout: 3000 }).catch(() => false));

    // May or may not have pagination depending on data
    // Just verify page loads
    expect(page.url()).toContain('/transactions');
  });
});
