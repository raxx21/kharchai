import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Check if user has session token (nextauth token)
  const token = request.cookies.get("authjs.session-token") || request.cookies.get("__Secure-authjs.session-token");

  // If no token, redirect to login
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/credit-cards/:path*",
    "/analytics/:path*",
    "/chat/:path*",
    "/settings/:path*",
    "/banks/:path*",
    "/bills/:path*",
  ],
};
