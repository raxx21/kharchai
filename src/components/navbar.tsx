"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ redirect: false });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <nav className="border-b bg-white dark:bg-gray-900">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center ml-0 lg:ml-0">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2">
              <Image
                src="/KharchAI-removebg-preview.png"
                alt="KharchAI"
                width={40}
                height={40}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
              />
              <span className="text-xl sm:text-2xl font-bold text-primary hidden lg:block">KharchAI</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {!mounted ? (
              <div className="h-10 w-20 sm:w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : session ? (
              <>
                <span className="hidden md:inline text-sm text-muted-foreground truncate max-w-[150px]">
                  {session.user.email}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="text-xs sm:text-sm"
                >
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-xs sm:text-sm">Login</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="text-xs sm:text-sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
