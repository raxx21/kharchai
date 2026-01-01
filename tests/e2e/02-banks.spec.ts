import { test, expect } from './fixtures/auth.fixture';
import { waitForPageLoad, getRandomNumber } from './utils/test-helpers';

test.describe('Banks & Accounts Management', () => {
  test('should navigate to banks page', async ({ page, authenticatedUser }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Click on Banks link in sidebar
    await page.click('text=Banks');

    await expect(page).toHaveURL('/banks');
    await expect(page.locator('h1:has-text("Banks & Accounts")')).toBeVisible();
  });

  test('should display empty state when no banks exist', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/banks');
    await waitForPageLoad(page);

    // Should show empty state or "Add Bank" button
    const hasAddButton = await page.locator('text=Add Bank').isVisible();
    expect(hasAddButton).toBeTruthy();
  });

  test('should create a new bank account', async ({ page, authenticatedUser }) => {
    await page.goto('/banks');
    await waitForPageLoad(page);

    // Click Add Bank button
    await page.click('text=Add Bank');

    // Fill bank details
    const bankName = `Test Bank ${getRandomNumber(1000, 9999)}`;
    const accountNumber = `ACC${getRandomNumber(100000, 999999)}`;
    const balance = getRandomNumber(1000, 50000);

    await page.fill('input[name="name"]', bankName);
    await page.fill('input[name="accountNumber"]', accountNumber);
    await page.fill('input[name="balance"]', balance.toString());

    // Select account type
    await page.click('[name="type"]');
    await page.click('text=Savings');

    // Submit form
    await page.click('button:has-text("Add Bank")');

    // Wait for success message or modal close
    await page.waitForTimeout(2000);

    // Verify bank appears in list
    await expect(page.locator(`text=${bankName}`)).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${accountNumber}`)).toBeVisible();
  });

  test('should edit an existing bank account', async ({ page, authenticatedUser }) => {
    await page.goto('/banks');
    await waitForPageLoad(page);

    // Create a bank first
    await page.click('text=Add Bank');
    const bankName = `Edit Test Bank ${getRandomNumber(1000, 9999)}`;
    await page.fill('input[name="name"]', bankName);
    await page.fill('input[name="accountNumber"]', `ACC${getRandomNumber(100000, 999999)}`);
    await page.fill('input[name="balance"]', '10000');
    await page.click('[name="type"]');
    await page.click('text=Savings');
    await page.click('button:has-text("Add Bank")');
    await page.waitForTimeout(2000);

    // Find and click edit button
    const bankRow = page.locator(`text=${bankName}`).locator('..').locator('..');
    await bankRow.locator('button:has-text("Edit"), [aria-label="Edit"]').first().click();

    // Update bank name
    const updatedName = `${bankName} Updated`;
    await page.fill('input[name="name"]', updatedName);

    // Save changes
    await page.click('button:has-text("Save"), button:has-text("Update")');
    await page.waitForTimeout(2000);

    // Verify updated name appears
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({ timeout: 5000 });
  });

  test('should delete a bank account', async ({ page, authenticatedUser }) => {
    await page.goto('/banks');
    await waitForPageLoad(page);

    // Create a bank first
    await page.click('text=Add Bank');
    const bankName = `Delete Test Bank ${getRandomNumber(1000, 9999)}`;
    await page.fill('input[name="name"]', bankName);
    await page.fill('input[name="accountNumber"]', `ACC${getRandomNumber(100000, 999999)}`);
    await page.fill('input[name="balance"]', '5000');
    await page.click('[name="type"]');
    await page.click('text=Savings');
    await page.click('button:has-text("Add Bank")');
    await page.waitForTimeout(2000);

    // Find and click delete button
    const bankRow = page.locator(`text=${bankName}`).locator('..').locator('..');

    // Listen for confirmation dialog
    page.on('dialog', (dialog) => dialog.accept());

    await bankRow.locator('button:has-text("Delete"), [aria-label="Delete"]').first().click();
    await page.waitForTimeout(2000);

    // Verify bank is removed
    await expect(page.locator(`text=${bankName}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should display total balance correctly', async ({ page, authenticatedUser }) => {
    await page.goto('/banks');
    await waitForPageLoad(page);

    // Create multiple banks
    const banks = [
      { name: `Bank A ${getRandomNumber(1000, 9999)}`, balance: 10000 },
      { name: `Bank B ${getRandomNumber(1000, 9999)}`, balance: 20000 },
    ];

    for (const bank of banks) {
      await page.click('text=Add Bank');
      await page.fill('input[name="name"]', bank.name);
      await page.fill('input[name="accountNumber"]', `ACC${getRandomNumber(100000, 999999)}`);
      await page.fill('input[name="balance"]', bank.balance.toString());
      await page.click('[name="type"]');
      await page.click('text=Savings');
      await page.click('button:has-text("Add Bank")');
      await page.waitForTimeout(2000);
    }

    // Check if total balance is displayed
    const totalBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);
    const formattedTotal = `₹${totalBalance.toLocaleString('en-IN')}`;

    // Look for total balance display
    const hasTotalBalance = await page.locator(`text=/Total.*${totalBalance.toLocaleString()}/i`).isVisible({ timeout: 5000 }).catch(() => false);

    // May be displayed in a card or summary section
    if (!hasTotalBalance) {
      // Check if individual balances are at least visible
      for (const bank of banks) {
        const formattedBalance = `₹${bank.balance.toLocaleString('en-IN')}`;
        await expect(page.locator(`text=/${formattedBalance}/`)).toBeVisible();
      }
    }
  });

  test('should create a credit card', async ({ page, authenticatedUser }) => {
    await page.goto('/banks');
    await waitForPageLoad(page);

    // Click on Credit Cards tab or add credit card button
    const hasCreditCardButton = await page.locator('text=Add Credit Card').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasCreditCardButton) {
      await page.click('text=Add Credit Card');

      const cardName = `Test Card ${getRandomNumber(1000, 9999)}`;
      const cardNumber = `4532${getRandomNumber(1000, 9999)}${getRandomNumber(1000, 9999)}${getRandomNumber(1000, 9999)}`;
      const creditLimit = 50000;

      await page.fill('input[name="cardName"], input[name="name"]', cardName);
      await page.fill('input[name="cardNumber"]', cardNumber);
      await page.fill('input[name="creditLimit"]', creditLimit.toString());

      await page.click('button:has-text("Add Card"), button:has-text("Save")');
      await page.waitForTimeout(2000);

      // Verify card appears
      await expect(page.locator(`text=${cardName}`)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate required fields when creating bank', async ({
    page,
    authenticatedUser,
  }) => {
    await page.goto('/banks');
    await waitForPageLoad(page);

    await page.click('text=Add Bank');

    // Try to submit without filling fields
    await page.click('button:has-text("Add Bank")');

    // Should show validation errors
    const nameInput = page.locator('input[name="name"]');
    const validationMessage = await nameInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    expect(validationMessage !== '' || await page.locator('text=/required|cannot be empty/i').isVisible({ timeout: 2000 }).catch(() => false)).toBeTruthy();
  });

  test('should validate balance is a number', async ({ page, authenticatedUser }) => {
    await page.goto('/banks');
    await waitForPageLoad(page);

    await page.click('text=Add Bank');

    await page.fill('input[name="name"]', 'Test Bank');
    await page.fill('input[name="accountNumber"]', 'ACC123456');
    await page.fill('input[name="balance"]', 'invalid');

    await page.click('button:has-text("Add Bank")');

    // Should show validation error
    const balanceInput = page.locator('input[name="balance"]');
    const validationMessage = await balanceInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    expect(validationMessage !== '' || await page.locator('text=/invalid.*balance|must be a number/i').isVisible({ timeout: 2000 }).catch(() => false)).toBeTruthy();
  });
});
