"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SpendingByCategoryChart } from "@/components/charts/spending-by-category-chart";
import { SpendingTrendChart } from "@/components/charts/spending-trend-chart";
import { BudgetVsActualChart } from "@/components/charts/budget-vs-actual-chart";
import { InsightsDisplay } from "@/components/insights/insights-display";
import { UpcomingBillsWidget } from "@/components/bills/upcoming-bills-widget";
import { getProgressBarColor } from "@/lib/utils/budget-helpers";
import { format } from "date-fns";

interface Budget {
  id: string;
  category: { name: string; icon?: string };
  amount: string;
  actualSpent: number;
  percentUsed: number;
  status: "ON_TRACK" | "WARNING" | "OVER_BUDGET";
}

interface Transaction {
  id: string;
  amount: string;
  description: string;
  transactionDate: string;
  type: string;
  category?: { name: string; icon?: string };
}

export default function DashboardPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBalance: 0,
    monthlyExpenses: 0,
    budgetRemaining: 0,
    creditCardBills: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch budgets
      const budgetsRes = await fetch("/api/budgets?active=true");
      const budgetsData = await budgetsRes.json();
      const budgetsList = budgetsData.budgets || [];
      setBudgets(budgetsList.slice(0, 5)); // Top 5 budgets

      // Fetch recent transactions
      const transactionsRes = await fetch("/api/transactions?limit=5");
      const transactionsData = await transactionsRes.json();
      const transactionsList = transactionsData.transactions || [];
      setTransactions(transactionsList);

      // Calculate monthly expenses
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRes = await fetch(
        `/api/analytics/spending?startDate=${startOfMonth.toISOString()}&endDate=${now.toISOString()}&groupBy=category`
      );
      const monthlyData = await monthlyRes.json();
      const monthlyExpenses = monthlyData.totalSpent || 0;

      // Calculate total balance (income - expenses)
      const allTransactionsRes = await fetch("/api/transactions?limit=1000");
      const allTransactionsData = await allTransactionsRes.json();
      const allTransactions = allTransactionsData.transactions || [];

      const totalIncome = allTransactions
        .filter((t: any) => t.type === "INCOME")
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      const totalExpenses = allTransactions
        .filter((t: any) => t.type === "EXPENSE")
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0);

      const totalBalance = totalIncome - totalExpenses;

      // Calculate budget remaining
      const totalBudgeted = budgetsList.reduce(
        (sum: number, b: Budget) => sum + parseFloat(b.amount),
        0
      );
      const totalSpent = budgetsList.reduce(
        (sum: number, b: Budget) => sum + b.actualSpent,
        0
      );
      const budgetRemaining = totalBudgeted - totalSpent;

      // Fetch credit card bills (current cycle totals)
      const banksRes = await fetch("/api/banks");
      const banksData = await banksRes.json();
      const creditCards = banksData.banks?.filter((b: any) => b.creditCard) || [];

      let creditCardBills = 0;
      for (const card of creditCards) {
        // This is simplified - in reality you'd fetch from cycle-transactions API
        creditCardBills += parseFloat(card.creditCard?.currentBalance || "0");
      }

      setStats({
        totalBalance,
        monthlyExpenses,
        budgetRemaining,
        creditCardBills,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
          Your financial overview at a glance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-bold ${
                stats.totalBalance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{Math.abs(stats.totalBalance).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalBalance >= 0 ? "Positive balance" : "Negative balance"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Monthly Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              ₹{stats.monthlyExpenses.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), "MMMM yyyy")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Budget Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-bold ${
                stats.budgetRemaining >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{Math.abs(stats.budgetRemaining).toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {budgets.length > 0 ? `${budgets.length} active budgets` : "No budgets set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Credit Card Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">
              ₹{stats.creditCardBills.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Current cycle</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights Section */}
      <InsightsDisplay limit={5} unreadOnly={true} showGenerateButton={true} />

      {/* Upcoming Bills Section */}
      <UpcomingBillsWidget />

      {/* Budget Overview Section */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="text-lg sm:text-xl">Budget Overview</CardTitle>
              <Link href="/budgets">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm w-full sm:w-auto">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgets.map((budget) => (
                <div key={budget.id} className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg sm:text-xl">{budget.category.icon}</span>
                      <span className="text-sm sm:text-base font-medium">{budget.category.name}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-7 sm:ml-0">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        ₹{budget.actualSpent.toLocaleString()} / ₹
                        {parseFloat(budget.amount).toLocaleString()}
                      </span>
                      <Badge
                        variant={
                          budget.status === "ON_TRACK"
                            ? "default"
                            : budget.status === "WARNING"
                            ? "secondary"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {budget.percentUsed}%
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(budget.percentUsed, 100)}
                    indicatorColor={getProgressBarColor(budget.status)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SpendingByCategoryChart />
        <SpendingTrendChart />
      </div>

      <BudgetVsActualChart />

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <CardTitle className="text-lg sm:text-xl">Recent Transactions</CardTitle>
              <Link href="/transactions">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm w-full sm:w-auto">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-2 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <span className="text-xl sm:text-2xl flex-shrink-0">{transaction.category?.icon || "💰"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm sm:text-base font-medium truncate">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {format(new Date(transaction.transactionDate), "MMM dd, yyyy")} •{" "}
                        {transaction.category?.name || "Uncategorized"}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`text-sm sm:text-base font-semibold ml-2 flex-shrink-0 ${
                      transaction.type === "INCOME" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {transaction.type === "INCOME" ? "+" : "-"}₹
                    {parseFloat(transaction.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Getting Started (only show if no data) */}
      {budgets.length === 0 && transactions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm sm:text-base flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-medium">Add your banks and credit cards</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Start by adding your financial accounts to track transactions
                  </p>
                  <Link href="/banks">
                    <Button variant="link" className="px-0 text-xs sm:text-sm h-auto mt-1">
                      Go to Banks →
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm sm:text-base flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-medium">Add transactions</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Record your income and expenses to start tracking
                  </p>
                  <Link href="/transactions">
                    <Button variant="link" className="px-0 text-xs sm:text-sm h-auto mt-1">
                      Go to Transactions →
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm sm:text-base flex-shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-sm sm:text-base font-medium">Set up budgets</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Create budgets to control your spending
                  </p>
                  <Link href="/budgets">
                    <Button variant="link" className="px-0 text-xs sm:text-sm h-auto mt-1">
                      Go to Budgets →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
