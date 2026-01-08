"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddCreditCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Bank {
  id: string;
  name: string;
}

export function AddCreditCardDialog({ open, onOpenChange, onSuccess }: AddCreditCardDialogProps) {
  const [loading, setLoading] = useState(false);
  const [creditCardBanks, setCreditCardBanks] = useState<Bank[]>([]);
  const [formData, setFormData] = useState({
    bankId: "",
    cardName: "",
    lastFourDigits: "",
    billingCycleStartDate: "1",
    billingCycleEndDate: "30",
    paymentDueDay: "5",
    creditLimit: "",
  });

  useEffect(() => {
    if (open) {
      fetchCreditCardBanks();
    }
  }, [open]);

  const fetchCreditCardBanks = async () => {
    try {
      // Fetch all banks with type CREDIT_CARD
      const res = await fetch("/api/banks?type=CREDIT_CARD");
      const data = await res.json();
      const banks = data.banks || [];

      // Fetch existing credit cards to filter out banks that already have credit cards
      const cardsRes = await fetch("/api/credit-cards");
      const cardsData = await cardsRes.json();
      const existingBankIds = new Set(
        (cardsData.creditCards || []).map((card: any) => card.bank.id)
      );

      // Filter out banks that already have credit cards
      const availableBanks = banks.filter((bank: Bank) => !existingBankIds.has(bank.id));
      setCreditCardBanks(availableBanks);
    } catch (error) {
      console.error("Failed to fetch credit card banks:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        bankId: formData.bankId,
        cardName: formData.cardName,
        lastFourDigits: formData.lastFourDigits || undefined,
        billingCycleStartDate: parseInt(formData.billingCycleStartDate),
        billingCycleEndDate: parseInt(formData.billingCycleEndDate),
        paymentDueDay: parseInt(formData.paymentDueDay),
        creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : undefined,
      };

      const res = await fetch("/api/credit-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add credit card");
      }

      // Reset form
      setFormData({
        bankId: "",
        cardName: "",
        lastFourDigits: "",
        billingCycleStartDate: "1",
        billingCycleEndDate: "30",
        paymentDueDay: "5",
        creditLimit: "",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to add credit card:", error);
      alert(error.message || "Failed to add credit card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Credit Card Details</DialogTitle>
        </DialogHeader>

        {creditCardBanks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No credit card banks available. Please add a bank with type "Credit Card" first from the Banks & Accounts page.
            </p>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="bankId">Select Credit Card Bank *</Label>
              <Select value={formData.bankId} onValueChange={(value) => setFormData({ ...formData, bankId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a credit card bank" />
                </SelectTrigger>
                <SelectContent>
                  {creditCardBanks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only showing banks you added with type "Credit Card"
              </p>
            </div>

            <div>
              <Label htmlFor="cardName">Card Name *</Label>
              <Input
                id="cardName"
                value={formData.cardName}
                onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                placeholder="e.g., Visa Platinum, MasterCard Gold"
                required
              />
            </div>

            <div>
              <Label htmlFor="lastFourDigits">Last 4 Digits (Optional)</Label>
              <Input
                id="lastFourDigits"
                value={formData.lastFourDigits}
                onChange={(e) => setFormData({ ...formData, lastFourDigits: e.target.value })}
                placeholder="1234"
                maxLength={4}
                pattern="[0-9]{4}"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billingCycleStartDate">Billing Cycle Start (Day) *</Label>
                <Input
                  id="billingCycleStartDate"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billingCycleStartDate}
                  onChange={(e) => setFormData({ ...formData, billingCycleStartDate: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Day of month (1-31)</p>
              </div>

              <div>
                <Label htmlFor="billingCycleEndDate">Billing Cycle End (Day) *</Label>
                <Input
                  id="billingCycleEndDate"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billingCycleEndDate}
                  onChange={(e) => setFormData({ ...formData, billingCycleEndDate: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Day of month (1-31)</p>
              </div>
            </div>

            <div>
              <Label htmlFor="paymentDueDay">Payment Due Day *</Label>
              <Input
                id="paymentDueDay"
                type="number"
                min="1"
                max="31"
                value={formData.paymentDueDay}
                onChange={(e) => setFormData({ ...formData, paymentDueDay: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Day of month (1-31)</p>
            </div>

            <div>
              <Label htmlFor="creditLimit">Credit Limit (₹) (Optional)</Label>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                placeholder="50000"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Credit Card"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
