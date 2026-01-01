"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { getBillStatusColor, getBillTypeIcon } from "@/lib/utils/bill-helpers";

interface UpcomingBill {
  id: string;
  dueDate: string;
  amount: string;
  status: string;
  bill: {
    id: string;
    name: string;
    billType: string;
  };
}

export function UpcomingBillsWidget() {
  const [bills, setBills] = useState<UpcomingBill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingBills();
  }, []);

  const fetchUpcomingBills = async () => {
    try {
      const res = await fetch("/api/bills/upcoming?days=30&limit=5");
      const data = await res.json();
      setBills(data.payments || []);
    } catch (error) {
      console.error("Failed to fetch upcoming bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return differenceInDays(due, today);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bills.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Upcoming Bills</CardTitle>
            <Link href="/bills">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No upcoming bills in the next 30 days</p>
            <Link href="/bills">
              <Button variant="link" className="mt-2">
                Add a Bill →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Upcoming Bills</CardTitle>
          <Link href="/bills">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bills.map((payment) => {
            const daysUntil = getDaysUntilDue(payment.dueDate);
            const isOverdue = daysUntil < 0;
            const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

            return (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 border"
                style={{
                  borderLeftWidth: "4px",
                  borderLeftColor: getBillStatusColor(payment.status as any),
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getBillTypeIcon(payment.bill.billType as any)}
                  </span>
                  <div>
                    <p className="font-medium">{payment.bill.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.dueDate), "MMM dd, yyyy")}
                      </p>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-xs">
                          {Math.abs(daysUntil)} day{Math.abs(daysUntil) !== 1 ? "s" : ""} overdue
                        </Badge>
                      )}
                      {isDueSoon && !isOverdue && (
                        <Badge variant="outline" className="text-xs">
                          Due in {daysUntil} day{daysUntil !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    ₹{parseFloat(payment.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
