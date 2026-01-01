import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedTestData() {
  console.log('🌱 Seeding test data...');

  try {
    // Create a comprehensive test user
    const email = 'test-comprehensive@example.com';
    const password = await bcrypt.hash('Test@1234', 10);

    const user = await prisma.user.create({
      data: {
        email,
        password,
        name: 'Comprehensive Test User',
      },
    });

    console.log('✅ Created test user:', email);

    // Create categories
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          userId: user.id,
          name: 'Salary',
          type: 'INCOME',
          icon: '💰',
          color: '#10b981',
        },
      }),
      prisma.category.create({
        data: {
          userId: user.id,
          name: 'Freelance',
          type: 'INCOME',
          icon: '💼',
          color: '#3b82f6',
        },
      }),
      prisma.category.create({
        data: {
          userId: user.id,
          name: 'Groceries',
          type: 'EXPENSE',
          icon: '🛒',
          color: '#ef4444',
        },
      }),
      prisma.category.create({
        data: {
          userId: user.id,
          name: 'Transport',
          type: 'EXPENSE',
          icon: '🚗',
          color: '#f59e0b',
        },
      }),
      prisma.category.create({
        data: {
          userId: user.id,
          name: 'Utilities',
          type: 'EXPENSE',
          icon: '💡',
          color: '#8b5cf6',
        },
      }),
      prisma.category.create({
        data: {
          userId: user.id,
          name: 'Entertainment',
          type: 'EXPENSE',
          icon: '🎬',
          color: '#ec4899',
        },
      }),
    ]);

    console.log('✅ Created', categories.length, 'categories');

    // Create banks
    const banks = await Promise.all([
      prisma.bank.create({
        data: {
          userId: user.id,
          name: 'Main Checking',
          accountNumber: 'ACC001',
          balance: '50000',
          type: 'CHECKING',
          isActive: true,
        },
      }),
      prisma.bank.create({
        data: {
          userId: user.id,
          name: 'Savings Account',
          accountNumber: 'ACC002',
          balance: '100000',
          type: 'SAVINGS',
          isActive: true,
        },
      }),
    ]);

    console.log('✅ Created', banks.length, 'bank accounts');

    // Create credit card
    const creditCard = await prisma.creditCard.create({
      data: {
        userId: user.id,
        cardName: 'Rewards Card',
        cardNumber: '4532123456789012',
        creditLimit: '100000',
        currentBalance: '15000',
        billingDate: 5,
        dueDate: 20,
        isActive: true,
      },
    });

    console.log('✅ Created credit card');

    // Create transactions
    const incomeCategory = categories.find((c) => c.type === 'INCOME');
    const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

    const transactions = [];

    // Income transactions
    for (let i = 0; i < 3; i++) {
      transactions.push(
        prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'INCOME',
            amount: (40000 + i * 5000).toString(),
            description: `Salary Payment ${i + 1}`,
            transactionDate: new Date(2024, 0, 1 + i * 30), // Jan, Feb, Mar
            categoryId: incomeCategory!.id,
            bankId: banks[0].id,
          },
        })
      );
    }

    // Expense transactions
    const expenseData = [
      { desc: 'Grocery Shopping', amount: 5000, cat: 0 },
      { desc: 'Fuel', amount: 3000, cat: 1 },
      { desc: 'Electric Bill', amount: 2000, cat: 2 },
      { desc: 'Movie Tickets', amount: 800, cat: 3 },
      { desc: 'Supermarket', amount: 4500, cat: 0 },
      { desc: 'Bus Pass', amount: 1500, cat: 1 },
    ];

    for (const data of expenseData) {
      transactions.push(
        prisma.transaction.create({
          data: {
            userId: user.id,
            type: 'EXPENSE',
            amount: data.amount.toString(),
            description: data.desc,
            transactionDate: new Date(),
            categoryId: expenseCategories[data.cat].id,
            bankId: banks[0].id,
          },
        })
      );
    }

    await Promise.all(transactions);
    console.log('✅ Created', transactions.length, 'transactions');

    // Create budgets
    const budgets = await Promise.all([
      prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: expenseCategories[0].id, // Groceries
          amount: '10000',
          period: 'MONTHLY',
        },
      }),
      prisma.budget.create({
        data: {
          userId: user.id,
          categoryId: expenseCategories[1].id, // Transport
          amount: '5000',
          period: 'MONTHLY',
        },
      }),
    ]);

    console.log('✅ Created', budgets.length, 'budgets');

    // Create bills
    const bills = await Promise.all([
      prisma.bill.create({
        data: {
          userId: user.id,
          name: 'Internet Bill',
          amount: '1500',
          billType: 'UTILITIES',
          categoryId: expenseCategories[2].id,
          recurrence: 'MONTHLY',
          startDate: new Date(),
          dayOfMonth: 5,
          reminderDaysBefore: 3,
          isActive: true,
        },
      }),
      prisma.bill.create({
        data: {
          userId: user.id,
          name: 'Netflix Subscription',
          amount: '799',
          billType: 'SUBSCRIPTION',
          categoryId: expenseCategories[3].id,
          recurrence: 'MONTHLY',
          startDate: new Date(),
          dayOfMonth: 15,
          reminderDaysBefore: 3,
          isActive: true,
        },
      }),
    ]);

    console.log('✅ Created', bills.length, 'bills');

    // Create bill payments
    for (const bill of bills) {
      await prisma.billPayment.create({
        data: {
          billId: bill.id,
          dueDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          amount: bill.amount,
          status: 'UPCOMING',
        },
      });
    }

    console.log('✅ Created bill payments');

    console.log('\n🎉 Test data seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: Test@1234`);
    console.log('\n📊 Created:');
    console.log(`   - 1 User`);
    console.log(`   - ${categories.length} Categories`);
    console.log(`   - ${banks.length} Bank Accounts`);
    console.log(`   - 1 Credit Card`);
    console.log(`   - ${transactions.length} Transactions`);
    console.log(`   - ${budgets.length} Budgets`);
    console.log(`   - ${bills.length} Bills`);
  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
