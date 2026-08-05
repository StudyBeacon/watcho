import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

// Run middleware on all routes except static assets and Next.js internals
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}