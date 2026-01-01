# KharchAI - E2E Testing Suite

Comprehensive end-to-end testing automation for KharchAI using Playwright.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Coverage](#test-coverage)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Reports](#test-reports)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [CI/CD Integration](#cicd-integration)

## 🎯 Overview

This testing suite provides comprehensive end-to-end testing for all features of KharchAI, including:

- User authentication (signup, login, logout)
- Banks and accounts management
- Transactions CRUD operations
- Budgets management
- Bills and payments
- Analytics and insights
- Settings and profile management

## ✅ Test Coverage

### Authentication Tests (`01-auth.spec.ts`)
- ✓ Display login page correctly
- ✓ Navigate to signup page
- ✓ Sign up new user
- ✓ Show error for duplicate email
- ✓ Login with valid credentials
- ✓ Show error for invalid credentials
- ✓ Require authentication for protected routes
- ✓ Validate email format
- ✓ Validate password requirements

### Banks Tests (`02-banks.spec.ts`)
- ✓ Navigate to banks page
- ✓ Display empty state
- ✓ Create new bank account
- ✓ Edit existing bank account
- ✓ Delete bank account
- ✓ Display total balance
- ✓ Create credit card
- ✓ Validate required fields
- ✓ Validate balance is a number

### Transactions Tests (`03-transactions.spec.ts`)
- ✓ Navigate to transactions page
- ✓ Display filters
- ✓ Create expense transaction
- ✓ Create income transaction
- ✓ Edit transaction
- ✓ Delete transaction
- ✓ Filter transactions by type
- ✓ Validate required fields
- ✓ Display pagination

### Budgets Tests (`04-budgets.spec.ts`)
- ✓ Navigate to budgets page
- ✓ Create monthly budget
- ✓ Create weekly budget
- ✓ Edit budget
- ✓ Delete budget
- ✓ Display budget progress
- ✓ Show budget alerts
- ✓ Validate budget amount
- ✓ Prevent duplicate budgets

### Bills Tests (`05-bills.spec.ts`)
- ✓ Navigate to bills page
- ✓ Create recurring monthly bill
- ✓ Create one-time bill
- ✓ Create subscription bill
- ✓ Mark bill as paid
- ✓ Edit bill
- ✓ Delete bill
- ✓ Display upcoming bills
- ✓ Show bill statistics
- ✓ Filter bills by type
- ✓ Validate required fields

### Analytics Tests (`06-analytics.spec.ts`)
- ✓ Navigate to analytics page
- ✓ Display analytics dashboard
- ✓ Show spending by category chart
- ✓ Show spending trend chart
- ✓ Show budget vs actual chart
- ✓ Change time period
- ✓ Display income vs expense summary
- ✓ Display savings rate
- ✓ Show top spending categories
- ✓ Display insights and trends
- ✓ Handle empty data gracefully

### Settings Tests (`07-settings.spec.ts`)
- ✓ Navigate to settings page
- ✓ Display settings sections
- ✓ Display profile information
- ✓ Update profile name
- ✓ Manage categories
- ✓ Create new category
- ✓ Edit category
- ✓ Delete category
- ✓ Display account settings
- ✓ Change password
- ✓ Navigate between settings tabs

**Total Tests: 80+**

## 🔧 Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL database
- `.env` file configured with all required environment variables

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

## 🚀 Running Tests

### Run All Tests (Recommended)
```bash
npm test
```

This command will:
1. Clean up previous test data
2. Run all E2E tests with Playwright
3. Generate a detailed HTML report
4. Prompt to open the report in your browser

### Individual Test Commands

#### Run tests in headless mode
```bash
npm run test:e2e
```

#### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

#### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

#### Debug tests
```bash
npm run test:e2e:debug
```

#### Generate report only
```bash
npm run test:report
```

#### Open latest report
```bash
npm run test:open-report
```

### Database Management

#### Seed test data
```bash
npm run test:seed
```

This creates a comprehensive test user with:
- User account (test-comprehensive@example.com)
- 6 categories (2 income, 4 expense)
- 2 bank accounts
- 1 credit card
- 9 transactions
- 2 budgets
- 2 bills with payments

#### Cleanup test data
```bash
npm run test:cleanup
```

Removes all test users (emails starting with 'test-')

## 📊 Test Reports

After running tests, you'll find reports in the `test-results/` directory:

### HTML Report (`test-results/report.html`)
Beautiful, detailed HTML report with:
- Summary statistics (total, passed, failed, skipped)
- Pass rate percentage
- Duration metrics
- Test suites breakdown
- Individual test results with errors
- Color-coded status indicators

### Playwright HTML Report (`test-results/html-report/index.html`)
Playwright's native HTML report with:
- Test execution timeline
- Screenshots on failure
- Videos on failure
- Trace files for debugging

### JSON Results (`test-results/test-results.json`)
Raw test results in JSON format for CI/CD integration

## 🏗️ Test Structure

```
tests/
├── e2e/                          # E2E test files
│   ├── 01-auth.spec.ts           # Authentication tests
│   ├── 02-banks.spec.ts          # Banks & accounts tests
│   ├── 03-transactions.spec.ts   # Transactions tests
│   ├── 04-budgets.spec.ts        # Budgets tests
│   ├── 05-bills.spec.ts          # Bills tests
│   ├── 06-analytics.spec.ts      # Analytics tests
│   ├── 07-settings.spec.ts       # Settings tests
│   ├── fixtures/                 # Test fixtures
│   │   └── auth.fixture.ts       # Authenticated user fixture
│   └── utils/                    # Test utilities
│       └── test-helpers.ts       # Helper functions
├── setup/                        # Setup scripts
│   ├── seed-test-data.ts         # Seed test data
│   └── cleanup-test-data.ts      # Cleanup test data
├── generate-report.ts            # Report generator
├── run-all-tests.sh              # Main test runner
└── README.md                     # This file
```

## ✍️ Writing Tests

### Using the Authenticated User Fixture

```typescript
import { test, expect } from './fixtures/auth.fixture';

test('should create a transaction', async ({ page, authenticatedUser, categories }) => {
  // authenticatedUser is already logged in
  // categories are pre-created

  await page.goto('/transactions');
  // ... your test code
});
```

### Using Helper Functions

```typescript
import {
  waitForPageLoad,
  createTestBank,
  getRandomNumber,
  formatCurrency,
} from './utils/test-helpers';

test('should display balance', async ({ page, authenticatedUser }) => {
  const bank = await createTestBank(
    authenticatedUser.id,
    'Test Bank',
    'ACC123',
    10000
  );

  await page.goto('/banks');
  await waitForPageLoad(page);

  await expect(page.locator(`text=${formatCurrency(10000)}`)).toBeVisible();
});
```

### Test Naming Convention

- Use descriptive test names starting with "should"
- Group related tests in `describe` blocks
- Use consistent naming: `should [action] [expected result]`

Example:
```typescript
test.describe('Transactions Management', () => {
  test('should create expense transaction', async ({ page }) => {
    // test code
  });

  test('should edit transaction', async ({ page }) => {
    // test code
  });
});
```

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install chromium

      - name: Run tests
        run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

      - name: Generate report
        if: always()
        run: npm run test:report

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## 🐛 Debugging

### Debug Single Test
```bash
npx playwright test tests/e2e/01-auth.spec.ts --debug
```

### View Test Trace
```bash
npx playwright show-trace test-results/.../trace.zip
```

### Take Screenshots
The test helpers include a `takeScreenshot` function:
```typescript
import { takeScreenshot } from './utils/test-helpers';

await takeScreenshot(page, 'error-state');
```

## 📝 Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data after tests complete
3. **Waits**: Use `waitForPageLoad()` and proper selectors instead of arbitrary timeouts
4. **Assertions**: Use meaningful assertions with timeout options
5. **Error Handling**: Use try-catch for cleanup in finally blocks
6. **Data**: Use fixtures and helpers for creating test data
7. **Selectors**: Prefer semantic selectors (text, role) over fragile CSS selectors

## 🎯 Future Enhancements

- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Accessibility testing (axe-core)
- [ ] API testing
- [ ] Mobile viewport testing
- [ ] Cross-browser testing (Firefox, Safari)
- [ ] Parallel test execution
- [ ] Test data factories

## 📞 Support

For issues or questions about the testing suite:
1. Check existing test files for examples
2. Review Playwright documentation: https://playwright.dev
3. Open an issue in the repository

---

**Happy Testing! 🎉**
