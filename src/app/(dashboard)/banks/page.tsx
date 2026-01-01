"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddBankDialog } from "@/components/banks/add-bank-dialog";
import { EditBankDialog } from "@/components/banks/edit-bank-dialog";
import { AddCreditCardDialog } from "@/components/banks/add-credit-card-dialog";
import { EditCreditCardDialog } from "@/components/banks/edit-credit-card-dialog";

interface Bank {
  id: string;
  name: string;
  type: "BANK" | "CREDIT_CARD" | "WALLET";
  color?: string;
  icon?: string;
  creditCard?: {
    id: string;
    cardName: string;
    lastFourDigits?: string;
    creditLimit?: string;
    billingCycleStartDate: number;
    billingCycleEndDate: number;
    paymentDueDay: number;
  };
  _count?: {
    transactions: number;
  };
}

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [addingCardForBank, setAddingCardForBank] = useState<Bank | null>(null);
  const [editingCreditCard, setEditingCreditCard] = useState<Bank["creditCard"] | null>(null);

  const fetchBanks = async () => {
    try {
      const response = await fetch("/api/banks");
      const data = await response.json();
      setBanks(data.banks || []);
    } catch (error) {
      console.error("Failed to fetch banks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank?")) return;

    try {
      const response = await fetch(`/api/banks/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchBanks();
      }
    } catch (error) {
      console.error("Failed to delete bank:", error);
    }
  };

  const getBankTypeColor = (type: string) => {
    switch (type) {
      case "BANK":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "CREDIT_CARD":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "WALLET":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getBankTypeLabel = (type: string) => {
    return type.replace("_", " ");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Banks & Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your financial accounts
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          Add Bank/Account
        </Button>
      </div>

      {banks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🏦</div>
            <h3 className="text-lg font-semibold mb-2">No banks added yet</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
              Add your first bank or credit card to start tracking your
              transactions
            </p>
            <Button onClick={() => setAddDialogOpen(true)}>
              Add Your First Bank
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banks.map((bank) => (
            <Card key={bank.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="text-3xl p-2 rounded-lg"
                      style={{
                        backgroundColor: bank.color
                          ? `${bank.color}20`
                          : "#f0f0f0",
                      }}
                    >
                      {bank.icon || "🏦"}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{bank.name}</CardTitle>
                      <Badge
                        className={`mt-1 ${getBankTypeColor(bank.type)}`}
                        variant="secondary"
                      >
                        {getBankTypeLabel(bank.type)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {bank.creditCard && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      {bank.creditCard.cardName}
                    </p>
                    {bank.creditCard.lastFourDigits && (
                      <p className="text-xs text-muted-foreground">
                        •••• {bank.creditCard.lastFourDigits}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Cycle: {bank.creditCard.billingCycleStartDate} -{" "}
                      {bank.creditCard.billingCycleEndDate} | Due:{" "}
                      {bank.creditCard.paymentDueDay}
                    </p>
                  </div>
                )}

                {bank._count && (
                  <p className="text-sm text-muted-foreground">
                    {bank._count.transactions} transaction
                    {bank._count.transactions !== 1 ? "s" : ""}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingBank(bank)}
                  >
                    Edit Bank
                  </Button>
                  {bank.type === "CREDIT_CARD" && !bank.creditCard && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setAddingCardForBank(bank)}
                    >
                      Add Card Info
                    </Button>
                  )}
                  {bank.creditCard && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditingCreditCard(bank.creditCard!)}
                    >
                      Edit Card
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(bank.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddBankDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchBanks}
      />

      {editingBank && (
        <EditBankDialog
          bank={editingBank}
          open={!!editingBank}
          onOpenChange={(open) => !open && setEditingBank(null)}
          onSuccess={fetchBanks}
        />
      )}

      {addingCardForBank && (
        <AddCreditCardDialog
          bank={addingCardForBank}
          open={!!addingCardForBank}
          onOpenChange={(open) => !open && setAddingCardForBank(null)}
          onSuccess={fetchBanks}
        />
      )}

      {editingCreditCard && (
        <EditCreditCardDialog
          creditCard={editingCreditCard}
          open={!!editingCreditCard}
          onOpenChange={(open) => !open && setEditingCreditCard(null)}
          onSuccess={fetchBanks}
        />
      )}
    </div>
  );
}
