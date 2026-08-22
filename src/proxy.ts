import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Refreshes the Supabase session cookie and turns anonymous hits on /admin
 * away early. Page-level checks in src/lib/auth.ts remain the real guard —
 * this only saves a wasted render.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && (path.startsWith("/admin") || path.startsWith("/account"))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/login", "/signup"],
};
