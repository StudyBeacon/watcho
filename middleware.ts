import { type NextRequest, NextResponse } from "next/server";

/**
 * Auth redirect middleware.
 * Lightweight and Edge-compatible — no Supabase client creation here.
 * Full Supabase auth happens in server components and route handlers.
 */
export async function middleware(request: NextRequest) {
  const authCookie = request.cookies.get("sb-fkrhdjfiegosovtwjglj-auth-token");

  const hasSession = !!authCookie?.value;
  const pathname = request.nextUrl.pathname;

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isProtectedRoute = pathname.startsWith("/servers");

  if (!hasSession && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/servers";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Run middleware on all routes except static assets and Next.js internals
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};