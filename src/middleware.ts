import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth cookie so server components see a valid session.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Only routes that read the session on the server. Public pages (home, legal) stay static and skip
  // the Supabase round trip; server actions refresh the session themselves.
  matcher: [
    "/modules/:path*",
    "/compte/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/connexion",
    "/inscription",
    "/auth/:path*",
  ],
};
