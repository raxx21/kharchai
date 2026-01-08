"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddCreditCardDialog } from "@/components/credit-cards/add-credit-card-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  generateBillingCycle,
  generateUpcomingCycles,
  formatBillingCycle,
} from "@/lib/billing-cycle";
import { format } from "date-fns";

interface CreditCard {
  id: string;
  cardName: string;
  lastFourDigits?: string;
  creditLimit?: string;
  currentBalance: string;
  billingCycleStartDate: number;
  billingCycleEndDate: number;
  paymentDueDay: number;
  bank: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
}

interface CycleTransactions {
  transactions: any[];
  total: number;
  cycleStart: string;
  cycleEnd: string;
}

export default function CreditCardsPage() {
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycleAmounts, setCycleAmounts] = useState<Record<string, number>>({});
  const [viewingCycle, setViewingCycle] = useState<{
    cardId: string;
    cardName: string;
    cycleStart: Date;
    cycleEnd: Date;
  } | null>(null);
  const [cycleTransactions, setCycleTransactions] =
    useState<CycleTransactions | null>(null);
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchCreditCards = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/banks");
      const data = await response.json();

      // Filter banks that have credit cards
      const cardsData =
        data.banks
          ?.filter((bank: any) => bank.creditCard)
          .map((bank: any) => ({
            ...bank.creditCard,
            bank: {
              id: bank.id,
              name: bank.name,
              color: bank.color,
              icon: bank.icon,
            },
          })) || [];

      setCreditCards(cardsData);

      // Fetch cycle amounts for each card
      await fetchAllCycleAmounts(cardsData);
    } catch (error) {
      console.error("Failed to fetch credit cards:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditCards();
  }, []);

  const fetchAllCycleAmounts = async (cards: CreditCard[]) => {
    const amounts: Record<string, number> = {};

    for (const card of cards) {
      const cycle = generateBillingCycle({
        billingCycleStartDate: card.billingCycleStartDate,
        billingCycleEndDate: card.billingCycleEndDate,
        paymentDueDay: card.paymentDueDay,
      });

      try {
        const response = await fetch(
          `/api/credit-cards/${card.id}/cycle-transactions?cycleStart=${cycle.cycleStartDate.toISOString()}&cycleEnd=${cycle.cycleEndDate.toISOString()}`
        );
        const data = await response.json();
        amounts[`${card.id}-current`] = data.total || 0;
      } catch (error) {
        console.error("Failed to fetch cycle amount:", error);
        amounts[`${card.id}-current`] = 0;
      }
    }

    setCycleAmounts(amounts);
  };

  const viewCycleTransactions = async (
    cardId: string,
    cardName: string,
    cycleStart: Date,
    cycleEnd: Date
  ) => {
    setViewingCycle({ cardId, cardName, cycleStart, cycleEnd });
    setLoadingCycle(true);

    try {
      const response = await fetch(
        `/api/credit-cards/${cardId}/cycle-transactions?cycleStart=${cycleStart.toISOString()}&cycleEnd=${cycleEnd.toISOString()}`
      );
      const data = await response.json();
      setCycleTransactions(data);
    } catch (error) {
      console.error("Failed to fetch cycle transactions:", error);
    } finally {
      setLoadingCycle(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (creditCards.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Credit Cards</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">💳</div>
            <h3 className="text-lg font-semibold mb-2">
              No credit cards added yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              First, add a bank with type "Credit Card" from Banks & Accounts, then add billing details here
            </p>
            <div className="flex gap-2">
              <Link href="/banks">
                <Button variant="outline">Go to Banks</Button>
              </Link>
              <Button onClick={() => setShowAddDialog(true)}>Add Credit Card Details</Button>
            </div>
          </CardContent>
        </Card>

        <AddCreditCardDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={fetchCreditCards}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Credit Cards</h1>
          <p className="text-muted-foreground mt-1">
            Manage your credit cards and billing cycles
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/banks">
            <Button variant="outline">Manage Banks</Button>
          </Link>
          <Button onClick={() => setShowAddDialog(true)}>Add Credit Card</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {creditCards.map((card) => {
          const upcomingCycles = generateUpcomingCycles(
            {
              billingCycleStartDate: card.billingCycleStartDate,
              billingCycleEndDate: card.billingCycleEndDate,
              paymentDueDay: card.paymentDueDay,
            },
            3
          );

          const currentCycle = upcomingCycles[0];
          const currentCycleAmount = cycleAmounts[`${card.id}-current`] || 0;

          return (
            <Card key={card.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="text-3xl p-2 rounded-lg"
                      style={{
                        backgroundColor: card.bank.color
                          ? `${card.bank.color}20`
                          : "#f0f0f0",
                      }}
                    >
                      {card.bank.icon || "💳"}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {card.cardName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {card.bank.name}
                        {card.lastFourDigits && ` •••• ${card.lastFourDigits}`}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {card.creditLimit && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Credit Limit
                      </p>
                      <p className="text-lg font-semibold">
                        ₹{parseFloat(card.creditLimit).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Available Credit
                      </p>
                      <p className="text-lg font-semibold text-green-600">
                        ₹{(parseFloat(card.creditLimit) - currentCycleAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Current Billing Cycle</h4>
                  <div className="space-y-2 bg-muted p-3 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Cycle Period:
                      </span>
                      <span className="font-medium">
                        {formatBillingCycle(currentCycle)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Billed Amount:
                      </span>
                      <span className="font-bold text-red-600">
                        ₹{currentCycleAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Payment Due:
                      </span>
                      <Badge variant="destructive">
                        {format(currentCycle.dueDate, "MMM dd, yyyy")}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() =>
                        viewCycleTransactions(
                          card.id,
                          card.cardName,
                          currentCycle.cycleStartDate,
                          currentCycle.cycleEndDate
                        )
                      }
                    >
                      View Transactions
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Upcoming Cycles</h4>
                  <div className="space-y-2">
                    {upcomingCycles.slice(1, 3).map((cycle, index) => (
                      <div
                        key={index}
                        className="flex justify-between text-sm p-2 rounded hover:bg-muted"
                      >
                        <span className="text-muted-foreground">
                          {formatBillingCycle(cycle)}
                        </span>
                        <span className="font-medium">
                          Due: {format(cycle.dueDate, "MMM dd")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Upcoming Due Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Credit Card</TableHead>
                <TableHead>Billing Cycle</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Days Until Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditCards.flatMap((card) => {
                const cycles = generateUpcomingCycles(
                  {
                    billingCycleStartDate: card.billingCycleStartDate,
                    billingCycleEndDate: card.billingCycleEndDate,
                    paymentDueDay: card.paymentDueDay,
                  },
                  3
                );

                return cycles.map((cycle, index) => {
                  const daysUntilDue = Math.ceil(
                    (cycle.dueDate.getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  );

                  return (
                    <TableRow key={`${card.id}-${index}`}>
                      <TableCell className="font-medium">
                        {card.cardName}
                        {card.lastFourDigits && (
                          <span className="text-muted-foreground ml-2">
                            •••• {card.lastFourDigits}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{formatBillingCycle(cycle)}</TableCell>
                      <TableCell>
                        {format(cycle.dueDate, "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            daysUntilDue <= 7
                              ? "destructive"
                              : daysUntilDue <= 14
                              ? "default"
                              : "secondary"
                          }
                        >
                          {daysUntilDue} days
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                });
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cycle Transactions Dialog */}
      <Dialog
        open={viewingCycle !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewingCycle(null);
            setCycleTransactions(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingCycle?.cardName} - Billing Cycle Transactions
            </DialogTitle>
            <DialogDescription>
              {viewingCycle && (
                <>
                  Cycle Period:{" "}
                  {format(viewingCycle.cycleStart, "MMM dd, yyyy")} -{" "}
                  {format(viewingCycle.cycleEnd, "MMM dd, yyyy")}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingCycle ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading transactions...
                </p>
              </div>
            </div>
          ) : cycleTransactions && cycleTransactions.transactions.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycleTransactions.transactions.map((transaction: any) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(
                          new Date(transaction.transactionDate),
                          "MMM dd, yyyy"
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          {transaction.notes && (
                            <p className="text-xs text-muted-foreground">
                              {transaction.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.category && (
                          <div className="flex items-center gap-2">
                            <span>{transaction.category.icon}</span>
                            <span className="text-sm">
                              {transaction.category.name}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        ₹{parseFloat(transaction.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-4 flex justify-between items-center">
                <span className="font-semibold">Total Billed Amount:</span>
                <span className="text-xl font-bold text-red-600">
                  ₹{cycleTransactions.total.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No transactions found in this billing cycle.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Credit Card Dialog */}
      <AddCreditCardDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchCreditCards}
      />
    </div>
  );
}
