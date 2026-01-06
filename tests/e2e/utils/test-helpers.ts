import { Page, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
}

export interface TestCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  icon: string;
}

export interface TestBank {
  id: string;
  name: string;
  accountNumber: string;
  balance: string;
}

/**
 * Create a test user in the database
 */
export async function createTestUser(
  email: string,
  password: string,
  name: string
): Promise<TestUser> {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      name,
    },
  });

  return {
    id: user.id,
    email,
    password, // Return plain password for login
    name,
  };
}

/**
 * Delete test user and all associated data
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await prisma.user.delete({
    where: { id: userId },
  });
}

/**
 * Clean up all test data (use with caution!)
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.billPayment.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.chatMessage.deleteMany({});
  await prisma.insight.deleteMany({});
  await prisma.creditCard.deleteMany({});
  await prisma.bank.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'test-',
      },
    },
  });
}

/**
 * Create default categories for testing
 */
export async function createDefaultCategories(userId: string): Promise<TestCategory[]> {
  const categories = [
    { name: 'Salary', type: 'INCOME' as const, icon: '💰', color: '#10b981' },
    { name: 'Groceries', type: 'EXPENSE' as const, icon: '🛒', color: '#ef4444' },
    { name: 'Transport', type: 'EXPENSE' as const, icon: '🚗', color: '#f59e0b' },
    { name: 'Utilities', type: 'EXPENSE' as const, icon: '💡', color: '#3b82f6' },
    { name: 'Entertainment', type: 'EXPENSE' as const, icon: '🎬', color: '#8b5cf6' },
  ];

  const created = await Promise.all(
    categories.map((cat) =>
      prisma.category.create({
        data: {
          userId,
          ...cat,
        },
      })
    )
  );

  return created.map((cat) => ({
    id: cat.id,
    name: cat.name,
    type: cat.type,
    icon: cat.icon || "📁",
  }));
}

/**
 * Create a test bank account
 */
export async function createTestBank(
  userId: string,
  name: string,
  accountNumber: string,
  balance: number
): Promise<TestBank> {
  const bank = await prisma.bank.create({
    data: {
      userId,
      name,
      accountNumber,
      balance: balance.toString(),
      type: 'SAVINGS',
      isActive: true,
    },
  });

  return {
    id: bank.id,
    name: bank.name,
    accountNumber: bank.accountNumber,
    balance: bank.balance.toString(),
  };
}

/**
 * Login helper function
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

/**
 * Logout helper function
 */
export async function logout(page: Page): Promise<void> {
  // Click on user menu or logout button
  await page.click('[data-testid="user-menu"]', { timeout: 5000 });
  await page.click('text=Logout', { timeout: 5000 });

  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 10000 });
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 5000
): Promise<any> {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );

  return response.json();
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Check if element is visible
 */
export async function isVisible(
  page: Page,
  selector: string,
  timeout: number = 3000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get random email for testing
 */
export function getRandomEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Get random number
 */
export function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Format currency for testing
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

export { prisma };
