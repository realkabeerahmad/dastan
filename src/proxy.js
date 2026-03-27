import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

// Public routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/register"];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Landing page: if logged in, redirect to dashboard. Otherwise public.
  if (pathname === "/") {
    const token = request.cookies.get("dastan_session")?.value;
    if (token) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  // Allow public auth routes and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    // If logged in and trying to access login/register, redirect to dashboard
    const token = request.cookies.get("dastan_session")?.value;
    if (token) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  const token = request.cookies.get("dastan_session")?.value;
  const session = token ? await verifyToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"  ],
};
