import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
    const isProtectedRoute = pathname.startsWith("/servers");

    if (isAuthPage || isProtectedRoute) {
      const authCookie = request.cookies.get("sb-fkrhdjfiegosovtwjglj-auth-token");
      const hasSession = !!authCookie?.value;

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
    }

    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};