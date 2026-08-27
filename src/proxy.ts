import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Paths that must stay reachable while the website is hidden. */
const ALWAYS_OPEN = ["/admin", "/login", "/signup", "/coming-soon", "/api"];

/**
 * Best-effort cache of the visibility switch. Proxy may run detached from the
 * render layer, so this is treated purely as an optimisation: a cold instance
 * just fetches again, and flipping the switch takes effect within the TTL.
 */
let visibility: { hidden: boolean; at: number } | null = null;
const VISIBILITY_TTL_MS = 30_000;

async function siteIsHidden(): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return false; // local dev, no backend
  if (visibility && Date.now() - visibility.at < VISIBILITY_TTL_MS) {
    return visibility.hidden;
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/settings?key=eq.site&select=value`,
      {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`settings lookup returned ${res.status}`);
    const rows = (await res.json()) as { value?: { status?: string } }[];
    // No row means the deployment predates the switch, and was already public.
    const hidden = rows.length > 0 && rows[0]?.value?.status === "coming_soon";
    visibility = { hidden, at: Date.now() };
    return hidden;
  } catch (err) {
    console.error("[cleenzy] visibility lookup failed:", err);
    // Fail closed: hold the holding page rather than reveal a site the owner
    // asked to keep hidden. Not cached, so recovery is immediate.
    return true;
  }
}

/**
 * Two jobs: turn anonymous hits on /admin away early, and — while the website
 * is hidden — serve the holding page before any customer page renders. The
 * gate has to live here rather than in a layout: a layout that declines to
 * render {children} still streams the real page in the RSC payload.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;

  if (!SUPABASE_URL || !SUPABASE_ANON) return response;

  if (!ALWAYS_OPEN.some((p) => path === p || path.startsWith(`${p}/`))) {
    // A Supabase auth cookie means this could be a staff member previewing the
    // site. Cheap pre-filter only — the real role check runs in the (site)
    // layout, which redirects anyone who turns out not to be staff.
    const maybeSignedIn = request.cookies
      .getAll()
      .some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));

    if (!maybeSignedIn && (await siteIsHidden())) {
      return NextResponse.rewrite(new URL("/coming-soon", request.url));
    }
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
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

  if (!user && path.startsWith("/admin")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, the metadata routes and static assets.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?)$).*)",
  ],
};
