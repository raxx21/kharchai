"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddBillDialog } from "@/components/bills/add-bill-dialog";
import { EditBillDialog } from "@/components/bills/edit-bill-dialog";
import { MarkBillPaidDialog } from "@/components/bills/mark-bill-paid-dialog";
import {
  getBillStatusColor,
  getBillStatusBadge,
  getBillTypeIcon,
  formatRecurrence,
  getStatusText,
} from "@/lib/utils/bill-helpers";
import { format, differenceInDays } from "date-fns";

interface Bill {
  id: string;
  name: string;
  billType: string;
  amount: string;
  recurrence: string;
  isActive: boolean;
  category: {
    name: string;
    icon?: string;
  };
  payments: Array<{
    id: string;
    dueDate: string;
    amount: string;
    status: string;
  }>;
}

interface BillStats {
  totalBills: number;
  activeBills: number;
  upcomingPayments: number;
  overduePayments: number;
  upcomingTotal: number;
  overdueTotal: number;
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats>({
    totalBills: 0,
    activeBills: 0,
    upcomingPayments: 0,
    overduePayments: 0,
    upcomingTotal: 0,
    overdueTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsRes, statsRes] = await Promise.all([
        fetch("/api/bills?active=true"),
        fetch("/api/bills/stats"),
      ]);

      const billsData = await billsRes.json();
      const statsData = await statsRes.json();

      setBills(billsData.bills || []);
      setStats(statsData.stats || stats);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = (payment: any, bill: Bill) => {
    setSelectedPayment({
      ...payment,
      bill: { name: bill.name },
    });
    setShowPayDialog(true);
  };

  const handleEditBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowEditDialog(true);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return differenceInDays(due, today);
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Bills</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Manage your recurring and one-time bills
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="text-sm sm:text-base w-full sm:w-auto"
        >
          Add Bill
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Active Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.activeBills}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalBills} total bills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Upcoming (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              ₹{stats.upcomingTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.upcomingPayments} payment{stats.upcomingPayments !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              ₹{stats.overdueTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.overduePayments} payment{stats.overduePayments !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Monthly Average
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              ₹{bills
                .reduce((sum, b) => {
                  if (b.recurrence === "MONTHLY") {
                    return sum + parseFloat(b.amount);
                  }
                  return sum;
                }, 0)
                .toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monthly bills only</p>
          </CardContent>
        </Card>
      </div>

      {/* Bills List */}
      {bills.length === 0 ? (
        <Card>
          <CardContent className="py-12 sm:py-16">
            <div className="text-center">
              <p className="text-base sm:text-lg text-muted-foreground mb-3 sm:mb-4">
                No bills yet. Add your first bill to get started!
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="text-sm sm:text-base">
                Add Your First Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {bills.map((bill) => {
            const nextPayment = bill.payments[0];
            const daysUntil = nextPayment ? getDaysUntilDue(nextPayment.dueDate) : null;

            return (
              <Card key={bill.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="text-2xl sm:text-3xl flex-shrink-0">
                        {getBillTypeIcon(bill.billType as any)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{bill.name}</h3>
                          {!bill.isActive && (
                            <Badge variant="secondary" className="w-fit text-xs">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {bill.category.icon} {bill.category.name}
                          </span>
                          <span className="hidden sm:inline">•</span>
                          <span>{formatRecurrence(bill.recurrence as any)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="font-medium">₹{parseFloat(bill.amount).toLocaleString()}</span>
                        </div>

                        {nextPayment && (
                          <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <Badge
                              variant={getBillStatusBadge(nextPayment.status as any)}
                              className="w-fit text-xs"
                              style={{
                                borderLeftWidth: "3px",
                                borderLeftColor: getBillStatusColor(nextPayment.status as any),
                              }}
                            >
                              {getStatusText(nextPayment.status as any)}
                            </Badge>
                            <span className="text-xs sm:text-sm">
                              Due: {format(new Date(nextPayment.dueDate), "MMM dd, yyyy")}
                              {daysUntil !== null && (
                                <span className="text-muted-foreground ml-1 sm:ml-2">
                                  ({daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                                    daysUntil === 0 ? "Due today" :
                                    `in ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditBill(bill)}
                        className="text-xs sm:text-sm w-full sm:w-auto"
                      >
                        Edit
                      </Button>
                      {nextPayment && nextPayment.status !== "PAID" && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(nextPayment, bill)}
                          className="text-xs sm:text-sm w-full sm:w-auto"
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <AddBillDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={fetchData}
      />

      <EditBillDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={fetchData}
        bill={selectedBill}
      />

      <MarkBillPaidDialog
        open={showPayDialog}
        onOpenChange={setShowPayDialog}
        onSuccess={fetchData}
        payment={selectedPayment}
      />
    </div>
  );
}
