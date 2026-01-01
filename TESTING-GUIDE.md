# KharchAI - Testing Quick Start Guide

This guide will help you quickly run the complete end-to-end testing suite for KharchAI.

## 🚀 Quick Start (5 Minutes)

### Step 1: Prerequisites Check
Make sure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ Database running (PostgreSQL)
- ✅ `.env` file configured with all required variables
- ✅ Dependencies installed (`npm install`)

### Step 2: Install Test Dependencies
```bash
# Install Playwright browsers (only needed once)
npx playwright install chromium
```

### Step 3: Run All Tests
```bash
npm test
```

That's it! The test runner will:
1. ✨ Clean up any previous test data
2. 🧪 Run all 80+ end-to-end tests
3. 📊 Generate a beautiful HTML report
4. 🎉 Show you the results

## 📊 Understanding the Results

After tests complete, you'll see:

```
📊 Summary:
   Total Tests: 85
   ✓ Passed: 82
   ✗ Failed: 3
   ⊘ Skipped: 0
   ⏱  Duration: 245.32s
   📊 Pass Rate: 96.47%
```

### View Detailed Report
```bash
npm run test:open-report
```

This opens a beautiful HTML report showing:
- 📈 Summary statistics with pass rate
- 📋 Test suites breakdown
- ✅ Individual test results
- ❌ Failure details with error messages
- ⏱️ Performance metrics

## 🎯 Common Test Commands

### Run tests and watch in real-time
```bash
npm run test:e2e:headed
```
*Opens a browser window so you can see tests running*

### Run tests with interactive UI
```bash
npm run test:e2e:ui
```
*Best for exploring and debugging tests*

### Debug a failing test
```bash
npm run test:e2e:debug
```
*Step through tests line by line*

### Run specific test file
```bash
npx playwright test tests/e2e/01-auth.spec.ts
```
*Run only authentication tests*

### Run tests matching a pattern
```bash
npx playwright test --grep "should create"
```
*Run all tests with "should create" in the name*

## 🗂️ What Gets Tested?

### ✅ Authentication (9 tests)
- Sign up new user
- Login/logout
- Protected routes
- Form validation

### ✅ Banks & Accounts (9 tests)
- Create/edit/delete banks
- Create credit cards
- Display balances
- Validation

### ✅ Transactions (9 tests)
- Create income/expense
- Edit/delete transactions
- Filtering
- Validation

### ✅ Budgets (9 tests)
- Create monthly/weekly budgets
- Edit/delete budgets
- Progress tracking
- Duplicate prevention

### ✅ Bills & Payments (12 tests)
- Create recurring bills
- Create one-time bills
- Mark as paid
- Bill management

### ✅ Analytics (13 tests)
- Charts and graphs
- Statistics
- Time period filtering
- Insights

### ✅ Settings (12 tests)
- Profile management
- Categories CRUD
- Account settings
- Preferences

**Total: 80+ comprehensive tests**

## 🔍 Interpreting Test Results

### ✅ All Green (100% Pass)
```
🎉 All tests passed!
```
Everything is working perfectly!

### ⚠️ Some Yellow (Skipped Tests)
```
⊘ Skipped: 5
```
Some tests were intentionally skipped (usually conditional features)

### ❌ Red Alert (Failed Tests)
```
❌ Some tests failed. Check the report for details.
```
1. Open the HTML report
2. Find the red "FAILED" tests
3. Click to see error details
4. Fix the issue
5. Re-run tests

## 🐛 Troubleshooting

### Issue: Tests timeout or hang
**Solution:**
```bash
# Make sure dev server is not already running
# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9

# Run tests again
npm test
```

### Issue: Database connection errors
**Solution:**
```bash
# Check .env file has correct DATABASE_URL
# Make sure PostgreSQL is running
# Run database migrations
npx prisma migrate deploy

# Try tests again
npm test
```

### Issue: "Cannot find module" errors
**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Reinstall Playwright
npx playwright install chromium

# Run tests
npm test
```

### Issue: Tests fail on authentication
**Solution:**
```bash
# Clean up test data
npm run test:cleanup

# Run tests again
npm test
```

## 📁 Test Reports Location

After running tests, find reports here:

```
test-results/
├── report.html              ← Main HTML report (open this!)
├── html-report/
│   └── index.html           ← Playwright's report
├── test-results.json        ← Raw JSON data
└── screenshots/             ← Failure screenshots
```

## 🎬 Watch Tests in Action

Want to see what the tests are doing?

```bash
npm run test:e2e:headed
```

This opens a real browser window and you can watch the automation:
- Forms being filled
- Buttons being clicked
- Pages navigating
- Data being created

It's pretty cool! 🎥

## 📊 Example Test Report

```
┌─────────────────────────────────────────┐
│     KharchAI Test Report                 │
│     Generated: Dec 28, 2025 10:30 AM    │
└─────────────────────────────────────────┘

Summary Statistics:
  Total Tests: 85
  ✓ Passed: 82 (96.47%)
  ✗ Failed: 3 (3.53%)
  ⊘ Skipped: 0
  Duration: 245.32s

Test Suites:
  ✓ Authentication (9/9)
  ✓ Banks & Accounts (9/9)
  ✓ Transactions (8/9) - 1 failed
  ✓ Budgets (9/9)
  ✗ Bills & Payments (11/12) - 1 failed
  ✗ Analytics (12/13) - 1 failed
  ✓ Settings (12/12)
```

## 🎯 Next Steps

1. **Run tests regularly** - before deploying
2. **Check reports** - understand what's tested
3. **Add new tests** - when adding features
4. **Keep tests green** - fix failures immediately

## 🆘 Need Help?

- 📖 Read full documentation: `tests/README.md`
- 🔍 Check Playwright docs: https://playwright.dev
- 🐛 Open an issue in the repository

---

**Happy Testing! 🧪✨**

Remember: Tests are your safety net. Keep them green! 🟢
