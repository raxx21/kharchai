"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Trash2, Bot, User as UserIcon, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChatHistory = async () => {
    try {
      setInitialLoading(true);
      const res = await fetch("/api/chat/history");
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      setLoading(true);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to send message");
      }

      const data = await res.json();

      // Add assistant response
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.message,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      inputRef.current?.focus();
    } catch (error: any) {
      setError(error.message || "Failed to send message. Please try again.");
      // Remove the optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg.id !== tempUserMsg.id));
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!confirm("Are you sure you want to clear all chat history?")) return;

    try {
      const res = await fetch("/api/chat/history", {
        method: "DELETE",
      });

      if (res.ok) {
        setMessages([]);
        setError(null);
      }
    } catch (error) {
      console.error("Failed to clear chat:", error);
      setError("Failed to clear chat history");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)] max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
            AI Financial Assistant
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Ask me anything about your finances
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="text-xs sm:text-sm w-full sm:w-auto"
          >
            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Clear Chat
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages Container */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-12">
              <div className="rounded-full bg-primary/10 p-4 sm:p-6 mb-4">
                <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                Welcome to your AI Financial Assistant!
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md">
                I can help you understand your spending, create budgets, analyze bills, and
                provide personalized financial advice.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => setInput("How much did I spend this month?")}
                >
                  <div className="text-xs sm:text-sm">
                    <div className="font-medium mb-1">💰 Monthly Spending</div>
                    <div className="text-muted-foreground font-normal">
                      Ask about this month&apos;s expenses
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => setInput("What are my upcoming bills?")}
                >
                  <div className="text-xs sm:text-sm">
                    <div className="font-medium mb-1">📄 Upcoming Bills</div>
                    <div className="text-muted-foreground font-normal">
                      Check bills due soon
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => setInput("How are my budgets doing?")}
                >
                  <div className="text-xs sm:text-sm">
                    <div className="font-medium mb-1">💸 Budget Status</div>
                    <div className="text-muted-foreground font-normal">
                      Review budget progress
                    </div>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4"
                  onClick={() => setInput("Give me financial advice")}
                >
                  <div className="text-xs sm:text-sm">
                    <div className="font-medium mb-1">💡 Financial Tips</div>
                    <div className="text-muted-foreground font-normal">
                      Get personalized advice
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex gap-3 sm:gap-4 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {message.role === "user" ? (
                      <UserIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`flex-1 ${
                      message.role === "user" ? "items-end" : "items-start"
                    } flex flex-col`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 sm:px-4 sm:py-3 max-w-[85%] sm:max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground mt-1 px-1">
                      {format(new Date(message.createdAt), "MMM dd, h:mm a")}
                    </span>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3 sm:gap-4">
                  <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center">
                    <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm sm:text-base text-muted-foreground">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </CardContent>

        {/* Input Area */}
        <div className="border-t p-3 sm:p-4 bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your finances..."
              disabled={loading}
              className="flex-1 text-sm sm:text-base"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              size="icon"
              className="flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 px-1">
            Press Enter to send • The AI can access your financial data to provide personalized insights
          </p>
        </div>
      </Card>
    </div>
  );
}
