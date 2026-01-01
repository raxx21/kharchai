"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Bell, TrendingUp, DollarSign, AlertTriangle, X, Calendar, AlertCircle } from "lucide-react";

interface Insight {
  id: string;
  type: "SPENDING_PATTERN" | "BUDGET_ALERT" | "SAVINGS_OPPORTUNITY" | "UNUSUAL_SPENDING" | "BILL_REMINDER" | "BILL_OVERDUE";
  title: string;
  description: string;
  isRead: boolean;
  createdAt: string;
  data: any;
}

interface InsightsDisplayProps {
  limit?: number;
  unreadOnly?: boolean;
  showGenerateButton?: boolean;
}

export function InsightsDisplay({
  limit = 10,
  unreadOnly = false,
  showGenerateButton = false,
}: InsightsDisplayProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchInsights();
  }, [unreadOnly, limit]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
      });
      if (unreadOnly) {
        params.append("unreadOnly", "true");
      }

      const res = await fetch(`/api/insights?${params.toString()}`);
      const data = await res.json();
      setInsights(data.insights || []);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    try {
      setGenerating(true);
      const res = await fetch("/api/insights/generate", {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        await fetchInsights(); // Refresh insights
      }
    } catch (error) {
      console.error("Failed to generate insights:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (res.ok) {
        setInsights(insights.filter((i) => i.id !== id));
      }
    } catch (error) {
      console.error("Failed to mark insight as read:", error);
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      const res = await fetch(`/api/insights/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setInsights(insights.filter((i) => i.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete insight:", error);
    }
  };

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "BUDGET_ALERT":
        return <AlertTriangle className="h-5 w-5" />;
      case "SPENDING_PATTERN":
        return <TrendingUp className="h-5 w-5" />;
      case "SAVINGS_OPPORTUNITY":
        return <DollarSign className="h-5 w-5" />;
      case "UNUSUAL_SPENDING":
        return <Bell className="h-5 w-5" />;
      case "BILL_REMINDER":
        return <Calendar className="h-5 w-5" />;
      case "BILL_OVERDUE":
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "BUDGET_ALERT":
        return "text-red-600 bg-red-50 border-red-200";
      case "SPENDING_PATTERN":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "SAVINGS_OPPORTUNITY":
        return "text-green-600 bg-green-50 border-green-200";
      case "UNUSUAL_SPENDING":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "BILL_REMINDER":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "BILL_OVERDUE":
        return "text-red-600 bg-red-50 border-red-200";
    }
  };

  const getBadgeVariant = (type: Insight["type"]) => {
    switch (type) {
      case "BUDGET_ALERT":
        return "destructive";
      case "BILL_OVERDUE":
        return "destructive";
      case "SAVINGS_OPPORTUNITY":
        return "default";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Insights</CardTitle>
          {showGenerateButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateInsights}
              disabled={generating}
            >
              {generating ? "Generating..." : "Generate Insights"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {unreadOnly
                ? "No new insights. You're all caught up!"
                : "No insights yet. Generate insights to get personalized recommendations."}
            </p>
            {showGenerateButton && (
              <Button
                variant="default"
                className="mt-4"
                onClick={handleGenerateInsights}
                disabled={generating}
              >
                {generating ? "Generating..." : "Generate Insights"}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getInsightIcon(insight.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{insight.title}</h4>
                        {!insight.isRead && (
                          <Badge variant="default" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 -mt-1 -mr-2"
                        onClick={() => handleDismiss(insight.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm mb-2">{insight.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-75">
                        {format(new Date(insight.createdAt), "MMM dd, yyyy")}
                      </span>
                      {!insight.isRead && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => handleMarkAsRead(insight.id)}
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
