"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  bill: any;
}

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Bank {
  id: string;
  name: string;
}

export function EditBillDialog({ open, onOpenChange, onSuccess, bill }: EditBillDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    billType: "UTILITIES",
    amount: "",
    categoryId: "",
    recurrence: "MONTHLY",
    startDate: "",
    endDate: "",
    dayOfMonth: "1",
    dayOfWeek: "0",
    reminderDaysBefore: "3",
    autoPay: false,
    bankId: "",
    notes: "",
  });

  useEffect(() => {
    if (open && bill) {
      fetchCategories();
      fetchBanks();

      // Pre-fill form with bill data
      setFormData({
        name: bill.name || "",
        description: bill.description || "",
        billType: bill.billType || "UTILITIES",
        amount: bill.amount?.toString() || "",
        categoryId: bill.category?.id || "",
        recurrence: bill.recurrence || "MONTHLY",
        startDate: bill.startDate ? new Date(bill.startDate).toISOString().split("T")[0] : "",
        endDate: bill.endDate ? new Date(bill.endDate).toISOString().split("T")[0] : "",
        dayOfMonth: bill.dayOfMonth?.toString() || "1",
        dayOfWeek: bill.dayOfWeek?.toString() || "0",
        reminderDaysBefore: bill.reminderDaysBefore?.toString() || "3",
        autoPay: bill.autoPay || false,
        bankId: bill.bank?.id || "",
        notes: bill.notes || "",
      });
    }
  }, [open, bill]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

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
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || undefined,
        billType: formData.billType,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        recurrence: formData.recurrence,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        reminderDaysBefore: parseInt(formData.reminderDaysBefore),
        autoPay: formData.autoPay,
        bankId: formData.bankId || null,
        notes: formData.notes || undefined,
      };

      // Add dayOfMonth for monthly/quarterly/semi-annual/annual bills
      if (["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"].includes(formData.recurrence)) {
        payload.dayOfMonth = parseInt(formData.dayOfMonth);
      }

      // Add dayOfWeek for weekly/biweekly bills
      if (["WEEKLY", "BIWEEKLY"].includes(formData.recurrence)) {
        payload.dayOfWeek = parseInt(formData.dayOfWeek);
      }

      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update bill");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to update bill:", error);
      alert(error.message || "Failed to update bill");
    } finally {
      setLoading(false);
    }
  };

  const showDayOfMonth = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"].includes(formData.recurrence);
  const showDayOfWeek = ["WEEKLY", "BIWEEKLY"].includes(formData.recurrence);
  const showEndDate = formData.recurrence !== "ONE_TIME";

  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bill</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Bill Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Internet, Netflix, Rent"
                required
              />
            </div>

            <div>
              <Label htmlFor="billType">Bill Type *</Label>
              <Select value={formData.billType} onValueChange={(value) => setFormData({ ...formData, billType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITIES">⚡ Utilities</SelectItem>
                  <SelectItem value="SUBSCRIPTION">📺 Subscription</SelectItem>
                  <SelectItem value="RENT_MORTGAGE">🏠 Rent/Mortgage</SelectItem>
                  <SelectItem value="INSURANCE">🛡️ Insurance</SelectItem>
                  <SelectItem value="OTHER">📋 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="recurrence">Recurrence *</Label>
              <Select value={formData.recurrence} onValueChange={(value) => setFormData({ ...formData, recurrence: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_TIME">One-time</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="BIWEEKLY">Every 2 weeks</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="SEMI_ANNUAL">Every 6 months</SelectItem>
                  <SelectItem value="ANNUAL">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showEndDate && (
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave empty for ongoing bills</p>
              </div>
            )}

            {showDayOfMonth && (
              <div>
                <Label htmlFor="dayOfMonth">Day of Month *</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth}
                  onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Due day (1-31)</p>
              </div>
            )}

            {showDayOfWeek && (
              <div>
                <Label htmlFor="dayOfWeek">Day of Week *</Label>
                <Select value={formData.dayOfWeek} onValueChange={(value) => setFormData({ ...formData, dayOfWeek: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="reminderDaysBefore">Reminder Days Before</Label>
              <Input
                id="reminderDaysBefore"
                type="number"
                min="0"
                max="30"
                value={formData.reminderDaysBefore}
                onChange={(e) => setFormData({ ...formData, reminderDaysBefore: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="bank">Payment Source (Optional)</Label>
              <Select value={formData.bankId || ""} onValueChange={(value) => setFormData({ ...formData, bankId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank (optional)" />
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

            <div className="col-span-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
