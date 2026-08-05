import { type NextRequest, NextResponse } from "next/server";

/**
 * Lightweight middleware for auth redirects.
 * Uses minimal cookie parsing to stay compatible with Vercel Edge runtime.
 * Full Supabase client creation happens in server components.
 */
export async function updateSession(request: NextRequest) {
  // Check for session cookie presence
  const authCookie = request.cookies.get("sb-fkrhdjfiegosovtwjglj-auth-token");

  const hasSession = !!authCookie?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
                     request.nextUrl.pathname.startsWith("/signup");
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/servers");

  if (!hasSession && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
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