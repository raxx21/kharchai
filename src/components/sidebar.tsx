"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-white dark:bg-gray-900 border-r min-h-screen">
      <nav className="p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.name}
              href={item.href}
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
  );
}
