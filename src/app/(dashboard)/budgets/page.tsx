"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AddBudgetDialog } from "@/components/budgets/add-budget-dialog";
import { EditBudgetDialog } from "@/components/budgets/edit-budget-dialog";
import { getStatusColor, getProgressBarColor } from "@/lib/utils/budget-helpers";

interface Budget {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  amount: string;
  period: "WEEKLY" | "MONTHLY" | "YEARLY";
  startDate: string;
  endDate: string | null;
  actualSpent: number;
  percentUsed: number;
  remaining: number;
  status: "ON_TRACK" | "WARNING" | "OVER_BUDGET";
  createdAt: string;
  updatedAt: string;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  useEffect(() => {
    fetchBudgets();
  }, [periodFilter]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (periodFilter !== "all") {
        params.append("period", periodFilter);
      }
      params.append("active", "true");

      const response = await fetch(`/api/budgets?${params.toString()}`);
      const data = await response.json();
      setBudgets(data.budgets || []);
    } catch (error) {
      console.error("Failed to fetch budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (budgetId: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) {
      return;
    }

    try {
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchBudgets();
      } else {
        alert("Failed to delete budget");
      }
    } catch (error) {
      console.error("Failed to delete budget:", error);
      alert("Failed to delete budget");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ON_TRACK":
        return "default";
      case "WARNING":
        return "secondary";
      case "OVER_BUDGET":
        return "destructive";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ON_TRACK":
        return "On Track";
      case "WARNING":
        return "Warning";
      case "OVER_BUDGET":
        return "Over Budget";
      default:
        return status;
    }
  };

  // Calculate summary totals
  const totalBudgeted = budgets.reduce((sum, b) => sum + parseFloat(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.actualSpent, 0);
  const totalRemaining = totalBudgeted - totalSpent;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Budgets</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your spending limits and track progress
          </p>
        </div>
        <Button
          onClick={() => setAddDialogOpen(true)}
          className="text-sm sm:text-base w-full sm:w-auto"
        >
          Create Budget
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Budgeted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              ₹{totalBudgeted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {budgets.length} {budgets.length === 1 ? "budget" : "budgets"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              ₹{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalBudgeted > 0
                ? `${Math.round((totalSpent / totalBudgeted) * 100)}% of budget`
                : "No budget set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Remaining Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-bold ${
                totalRemaining >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              ₹{totalRemaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalRemaining >= 0 ? "Available to spend" : "Over budget"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle className="text-lg sm:text-xl">Active Budgets</CardTitle>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full sm:w-[180px] text-sm sm:text-base">
                <SelectValue placeholder="Filter by period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {budgets.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">💰</div>
              <h3 className="text-base sm:text-lg font-semibold mb-2">No budgets created yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Create budgets to track your spending and stay on top of your finances
              </p>
              <Button onClick={() => setAddDialogOpen(true)} className="text-sm sm:text-base">
                Create Your First Budget
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {budgets.map((budget) => (
                <Card key={budget.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div
                          className="text-2xl sm:text-3xl p-1.5 sm:p-2 rounded-lg flex-shrink-0"
                          style={{
                            backgroundColor: budget.category.color
                              ? `${budget.category.color}20`
                              : "#f0f0f0",
                          }}
                        >
                          {budget.category.icon || "📊"}
                        </div>
                        <div>
                          <CardTitle className="text-base sm:text-lg">
                            {budget.category.name}
                          </CardTitle>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {budget.period.charAt(0) +
                              budget.period.slice(1).toLowerCase()}{" "}
                            Budget
                          </p>
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(budget.status)} className="text-xs w-fit">
                        {getStatusLabel(budget.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 sm:space-y-3">
                    {/* Amount Display */}
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Spent:</span>
                      <span className="font-semibold text-red-600">
                        ₹{budget.actualSpent.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Budget:</span>
                      <span className="font-semibold">
                        ₹{parseFloat(budget.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <Progress
                      value={Math.min(budget.percentUsed, 100)}
                      indicatorColor={getProgressBarColor(budget.status)}
                    />

                    {/* Details Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm pt-1 sm:pt-2">
                      <div>
                        <p className="text-muted-foreground text-xs">Remaining</p>
                        <p className={`font-semibold truncate ${budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{Math.abs(budget.remaining).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                          {budget.remaining < 0 && " over"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Period</p>
                        <p className="font-semibold">
                          {budget.period.charAt(0) +
                            budget.period.slice(1).toLowerCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Used</p>
                        <p className={`font-semibold ${getStatusColor(budget.status)}`}>
                          {budget.percentUsed}%
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs sm:text-sm"
                        onClick={() => setEditingBudget(budget)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 text-xs sm:text-sm"
                        onClick={() => handleDelete(budget.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddBudgetDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchBudgets}
      />

      {editingBudget && (
        <EditBudgetDialog
          budget={editingBudget}
          open={!!editingBudget}
          onOpenChange={(open) => !open && setEditingBudget(null)}
          onSuccess={fetchBudgets}
        />
      )}
    </div>
  );
}
