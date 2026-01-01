#!/bin/bash

# KharchAI - Comprehensive E2E Test Runner
# This script runs all tests and generates a detailed report

echo "🚀 KharchAI - E2E Test Suite"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create a .env file with required environment variables"
    exit 1
fi

# Create test-results directory if it doesn't exist
mkdir -p test-results/screenshots

echo -e "${YELLOW}📋 Step 1: Generating Prisma Client...${NC}"
npx prisma generate
echo ""

echo -e "${YELLOW}📋 Step 2: Cleaning up previous test data...${NC}"
npm run test:cleanup || true
echo ""

echo -e "${YELLOW}🌱 Step 3: Seeding test data (optional)...${NC}"
echo "Skipping data seeding - tests will create their own data"
echo ""

echo -e "${YELLOW}🧪 Step 4: Running Playwright E2E tests...${NC}"
npx playwright test

TEST_EXIT_CODE=$?
echo ""

echo -e "${YELLOW}📊 Step 5: Generating detailed HTML report...${NC}"
npx tsx tests/generate-report.ts

REPORT_EXIT_CODE=$?
echo ""

# Open report in browser (optional)
if [ $REPORT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Report generated successfully!${NC}"
    echo ""
    echo "📁 Test Results:"
    echo "   - HTML Report: test-results/report.html"
    echo "   - Playwright Report: playwright-report/index.html"
    echo "   - JSON Results: test-results/test-results.json"
    echo ""

    # Ask user if they want to open the report
    read -p "Would you like to open the HTML report? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open test-results/report.html
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            xdg-open test-results/report.html
        else
            echo "Please open test-results/report.html manually"
        fi
    fi
else
    echo -e "${RED}❌ Report generation failed${NC}"
fi

echo ""
echo "================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Check the report for details.${NC}"
    exit 1
fi
