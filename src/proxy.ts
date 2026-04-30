import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/api/auth",
  "/api/",
  "/_next/",
  "/favicon",
  "/onboarding",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/hire",
  "/build",
  "/pricing",
  "/terms",
  "/privacy",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root landing page is always public
  if (pathname === "/") return NextResponse.next();

  // Let public/static/auth paths pass through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Not logged in — let NextAuth handle redirect
  if (!token) return NextResponse.next();

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
