"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MarkBillPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  payment: {
    id: string;
    amount: number;
    bill: {
      name: string;
    };
  } | null;
}

interface Bank {
  id: string;
  name: string;
}

export function MarkBillPaidDialog({ open, onOpenChange, onSuccess, payment }: MarkBillPaidDialogProps) {
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);

  const [formData, setFormData] = useState({
    paidAmount: "",
    paidDate: new Date().toISOString().split("T")[0],
    bankId: "",
    notes: "",
  });

  useEffect(() => {
    if (open && payment) {
      setFormData({
        paidAmount: payment.amount.toString(),
        paidDate: new Date().toISOString().split("T")[0],
        bankId: "",
        notes: "",
      });
      fetchBanks();
    }
  }, [open, payment]);

  const fetchBanks = async () => {
    try {
      const res = await fetch("/api/banks");
      const data = await res.json();
      setBanks(data.banks || []);
    } catch (error) {
      console.error("Failed to fetch banks:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/bills/payments/${payment.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAmount: parseFloat(formData.paidAmount),
          paidDate: new Date(formData.paidDate).toISOString(),
          bankId: formData.bankId,
          notes: formData.notes || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to mark bill as paid");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to mark bill as paid:", error);
      alert(error.message || "Failed to mark bill as paid");
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Bill as Paid</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Bill</Label>
            <div className="text-sm font-medium">{payment.bill.name}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAmount">Paid Amount (₹) *</Label>
            <Input
              id="paidAmount"
              type="number"
              step="0.01"
              value={formData.paidAmount}
              onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidDate">Payment Date *</Label>
            <Input
              id="paidDate"
              type="date"
              value={formData.paidDate}
              onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bank">Payment Source *</Label>
            <Select value={formData.bankId} onValueChange={(value) => setFormData({ ...formData, bankId: value })} required>
              <SelectTrigger>
                <SelectValue placeholder="Select bank/account" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank.id} value={bank.id}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <p className="text-blue-900">
              <strong>Note:</strong> Marking this bill as paid will automatically create an expense transaction in your transactions list.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.bankId}>
              {loading ? "Processing..." : "Mark as Paid & Create Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
