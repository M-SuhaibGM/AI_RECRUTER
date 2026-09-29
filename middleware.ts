// middleware.ts — no authOptions import
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Logged in + visiting auth pages → dashboard
  if (token && (pathname === "/auth/login" || pathname === "/auth/register")) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/dashboard";
    return NextResponse.redirect(new URL(callbackUrl, req.url));
  }

  // Protected routes
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/all-interview") ||
    pathname.startsWith("/scheduled-interview") ||
    pathname.startsWith("/communication");

  if (isProtected && !token) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|css|js)$).*)",
  ],
};