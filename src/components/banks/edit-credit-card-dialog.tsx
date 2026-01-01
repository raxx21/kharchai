"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreditCard {
  id: string;
  cardName: string;
  lastFourDigits?: string;
  creditLimit?: string;
  billingCycleStartDate: number;
  billingCycleEndDate: number;
  paymentDueDay: number;
}

interface EditCreditCardDialogProps {
  creditCard: CreditCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditCreditCardDialog({
  creditCard,
  open,
  onOpenChange,
  onSuccess,
}: EditCreditCardDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cardName: creditCard.cardName,
    lastFourDigits: creditCard.lastFourDigits || "",
    billingCycleStartDate: creditCard.billingCycleStartDate,
    billingCycleEndDate: creditCard.billingCycleEndDate,
    paymentDueDay: creditCard.paymentDueDay,
    creditLimit: creditCard.creditLimit
      ? parseFloat(creditCard.creditLimit).toString()
      : "",
  });

  useEffect(() => {
    setFormData({
      cardName: creditCard.cardName,
      lastFourDigits: creditCard.lastFourDigits || "",
      billingCycleStartDate: creditCard.billingCycleStartDate,
      billingCycleEndDate: creditCard.billingCycleEndDate,
      paymentDueDay: creditCard.paymentDueDay,
      creditLimit: creditCard.creditLimit
        ? parseFloat(creditCard.creditLimit).toString()
        : "",
    });
  }, [creditCard]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/credit-cards/${creditCard.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName: formData.cardName,
          lastFourDigits: formData.lastFourDigits || undefined,
          billingCycleStartDate: Number(formData.billingCycleStartDate),
          billingCycleEndDate: Number(formData.billingCycleEndDate),
          paymentDueDay: Number(formData.paymentDueDay),
          creditLimit: formData.creditLimit
            ? Number(formData.creditLimit)
            : undefined,
        }),
      });

      if (response.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        const data = await response.json();
        alert(data.error || "Failed to update credit card");
      }
    } catch (error) {
      console.error("Error updating credit card:", error);
      alert("Failed to update credit card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Credit Card Details</DialogTitle>
            <DialogDescription>
              Update your credit card information and billing cycle
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="cardName">Card Name</Label>
              <Input
                id="cardName"
                placeholder="e.g., Visa Platinum"
                value={formData.cardName}
                onChange={(e) =>
                  setFormData({ ...formData, cardName: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastFourDigits">
                Last 4 Digits (Optional)
              </Label>
              <Input
                id="lastFourDigits"
                placeholder="1234"
                maxLength={4}
                value={formData.lastFourDigits}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setFormData({ ...formData, lastFourDigits: value });
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditLimit">Credit Limit (Optional)</Label>
              <Input
                id="creditLimit"
                type="number"
                placeholder="10000"
                value={formData.creditLimit}
                onChange={(e) =>
                  setFormData({ ...formData, creditLimit: e.target.value })
                }
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Billing Cycle Configuration</h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingCycleStartDate">
                    Cycle Start Date
                  </Label>
                  <Input
                    id="billingCycleStartDate"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.billingCycleStartDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingCycleStartDate: Number(e.target.value),
                      })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Day of month (1-31)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billingCycleEndDate">Cycle End Date</Label>
                  <Input
                    id="billingCycleEndDate"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.billingCycleEndDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billingCycleEndDate: Number(e.target.value),
                      })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Day of month (1-31)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDueDay">Payment Due Day</Label>
                <Input
                  id="paymentDueDay"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.paymentDueDay}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentDueDay: Number(e.target.value),
                    })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Day of month when payment is due (1-31)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
