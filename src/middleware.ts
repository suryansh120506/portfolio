import { NextResponse, type NextRequest } from "next/server";
import { studioCookieName, verifyStudioSession } from "@/lib/studio-session";

/**
 * Gate in front of /studio.
 *
 * Runs before the route renders, so an unauthenticated visitor never receives
 * the Studio bundle at all — the redirect happens at the edge rather than
 * after the page has already been shipped and hydrated. That is the reason
 * this is middleware and not a check inside the page component.
 *
 * `/studio/login` is excluded, or there would be nowhere to type the
 * password.
 *
 * Scope note: this protects the route. It does not protect the Sanity
 * dataset — see the comment in `lib/studio-session.ts`.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/studio/login") return NextResponse.next();

  const authorised = await verifyStudioSession(
    request.cookies.get(studioCookieName)?.value,
  );
  if (authorised) return NextResponse.next();

  const login = request.nextUrl.clone();
  login.pathname = "/studio/login";
  login.search = "";
  // Remember where they were headed so the Studio's own deep links survive
  // the round trip through the password form.
  if (pathname !== "/studio") {
    login.searchParams.set("next", pathname + search);
  }
  return NextResponse.redirect(login);
}

export const config = {
  // Only /studio. Everything else — the site, the API, static assets — is
  // untouched, so this adds no per-request work to the portfolio itself.
  matcher: ["/studio/:path*", "/studio"],
};
