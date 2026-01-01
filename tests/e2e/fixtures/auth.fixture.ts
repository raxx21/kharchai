import { test as base } from '@playwright/test';
import {
  createTestUser,
  deleteTestUser,
  login,
  createDefaultCategories,
  getRandomEmail,
  TestUser,
  TestCategory,
} from '../utils/test-helpers';

type AuthFixtures = {
  authenticatedUser: TestUser;
  categories: TestCategory[];
};

export const test = base.extend<AuthFixtures>({
  authenticatedUser: async ({ page }, use) => {
    // Setup: Create user and login
    const email = getRandomEmail();
    const password = 'Test@1234';
    const name = 'Test User';

    const user = await createTestUser(email, password, name);
    await login(page, email, password);

    // Provide user to test
    await use(user);

    // Teardown: Delete user
    try {
      await deleteTestUser(user.id);
    } catch (error) {
      console.error('Failed to delete test user:', error);
    }
  },

  categories: async ({ authenticatedUser }, use) => {
    // Setup: Create default categories
    const categories = await createDefaultCategories(authenticatedUser.id);

    // Provide categories to test
    await use(categories);

    // Teardown happens automatically via cascade delete
  },
});

export { expect } from '@playwright/test';
