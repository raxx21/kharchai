import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  try {
    // Delete all test-related data in order
    const deletedBillPayments = await prisma.billPayment.deleteMany({});
    console.log('✓ Deleted', deletedBillPayments.count, 'bill payments');

    const deletedBills = await prisma.bill.deleteMany({});
    console.log('✓ Deleted', deletedBills.count, 'bills');

    const deletedTransactions = await prisma.transaction.deleteMany({});
    console.log('✓ Deleted', deletedTransactions.count, 'transactions');

    const deletedBudgets = await prisma.budget.deleteMany({});
    console.log('✓ Deleted', deletedBudgets.count, 'budgets');

    const deletedChatMessages = await prisma.chatMessage.deleteMany({});
    console.log('✓ Deleted', deletedChatMessages.count, 'chat messages');

    const deletedInsights = await prisma.insight.deleteMany({});
    console.log('✓ Deleted', deletedInsights.count, 'insights');

    const deletedCreditCards = await prisma.creditCard.deleteMany({});
    console.log('✓ Deleted', deletedCreditCards.count, 'credit cards');

    const deletedBanks = await prisma.bank.deleteMany({});
    console.log('✓ Deleted', deletedBanks.count, 'banks');

    const deletedCategories = await prisma.category.deleteMany({});
    console.log('✓ Deleted', deletedCategories.count, 'categories');

    // Delete only test users (emails starting with 'test-')
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: 'test-',
        },
      },
    });
    console.log('✓ Deleted', deletedUsers.count, 'test users');

    console.log('\n✅ Test data cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
