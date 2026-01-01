import { test, expect } from '@playwright/test';
import {
  getRandomEmail,
  cleanupTestData,
  waitForPageLoad,
  prisma,
} from './utils/test-helpers';

test.describe('Authentication Flow', () => {
  test.beforeAll(async () => {
    // Clean up before running tests
    await cleanupTestData();
  });

  test.afterAll(async () => {
    // Clean up after tests
    await cleanupTestData();
    await prisma.$disconnect();
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    await waitForPageLoad(page);

    // Check page title
    await expect(page).toHaveTitle(/KharchAI/i);

    // Check form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check for "Don't have an account?" link
    await expect(page.locator('text=Don\'t have an account?')).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Sign up');

    await expect(page).toHaveURL('/signup');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should sign up a new user successfully', async ({ page }) => {
    const email = getRandomEmail();
    const password = 'Test@1234';
    const name = 'Test User';

    await page.goto('/signup');
    await waitForPageLoad(page);

    // Fill signup form
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 15000 });

    // Verify we're on dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { email },
    });
    expect(user).toBeTruthy();
    expect(user?.name).toBe(name);
    expect(user?.email).toBe(email);

    // Cleanup
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  test('should show error for duplicate email signup', async ({ page }) => {
    const email = getRandomEmail();
    const password = 'Test@1234';
    const name = 'Test User';

    // Create user first
    await page.goto('/signup');
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 15000 });

    // Logout
    await page.goto('/login');

    // Try to sign up with same email
    await page.goto('/signup');
    await page.fill('input[name="name"]', 'Another User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Test@5678');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=/already exists|already registered/i')).toBeVisible({
      timeout: 5000,
    });

    // Cleanup
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  test('should login with valid credentials', async ({ page }) => {
    const email = getRandomEmail();
    const password = 'Test@1234';
    const name = 'Test User';

    // Create user via signup
    await page.goto('/signup');
    await page.fill('input[name="name"]', name);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 15000 });

    // Logout (go to login page)
    await page.goto('/login');

    // Login
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL('/dashboard');

    // Cleanup
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login');

    // Try to login with invalid credentials
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(
      page.locator('text=/Invalid credentials|Invalid email or password/i')
    ).toBeVisible({ timeout: 5000 });

    // Should stay on login page
    await expect(page).toHaveURL('/login');
  });

  test('should require authentication for protected routes', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 10000 });
    await expect(page).toHaveURL('/login');

    // Try to access other protected routes
    const protectedRoutes = ['/transactions', '/budgets', '/bills', '/analytics'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL('/login', { timeout: 10000 });
      await expect(page).toHaveURL('/login');
    }
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Test@1234');
    await page.click('button[type="submit"]');

    // Should show validation error (either HTML5 or custom)
    const emailInput = page.locator('input[name="email"]');
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    // Either HTML5 validation or custom error message
    const hasError = validationMessage !== '' ||
      await page.locator('text=/Invalid email|Please enter a valid email/i').isVisible();

    expect(hasError).toBeTruthy();
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit with weak password
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', getRandomEmail());
    await page.fill('input[name="password"]', '123'); // Too short
    await page.click('button[type="submit"]');

    // Should show password validation error
    const passwordError = await page.locator('text=/password.*at least|password.*too short/i').isVisible({ timeout: 3000 }).catch(() => false);
    const inputValidation = await page.locator('input[name="password"]').evaluate(
      (el: HTMLInputElement) => el.validationMessage
    );

    expect(passwordError || inputValidation !== '').toBeTruthy();
  });
});
