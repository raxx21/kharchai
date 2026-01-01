"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "Banks & Accounts", href: "/banks", icon: "🏦" },
  { name: "Credit Cards", href: "/credit-cards", icon: "💳" },
  { name: "Transactions", href: "/transactions", icon: "💵" },
  { name: "Budgets", href: "/budgets", icon: "💰" },
  { name: "Bills", href: "/bills", icon: "📄" },
  { name: "Analytics", href: "/analytics", icon: "📈" },
  { name: "AI Chat", href: "/chat", icon: "🤖" },
  { name: "Settings", href: "/settings", icon: "⚙️" },
];

export function ResponsiveSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-white dark:bg-gray-900"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r min-h-screen transition-transform duration-300 ease-in-out",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-4 pt-20 lg:pt-4">
          <div className="mb-6 px-4 lg:hidden flex items-center gap-2">
            <Image
              src="/KharchAI-removebg-preview.png"
              alt="KharchAI"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-2xl font-bold text-primary">KharchAI</h1>
          </div>
          <nav className="space-y-2">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
