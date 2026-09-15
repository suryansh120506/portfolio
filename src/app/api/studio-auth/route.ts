import { NextResponse } from "next/server";
import {
  createStudioSession,
  isStudioAuthConfigured,
  passwordMatches,
  studioCookieName,
} from "@/lib/studio-session";

/**
 * Exchanges the studio password for a signed session cookie.
 *
 * Fails closed: with no password configured, nothing is ever issued, so an
 * unconfigured deployment cannot be walked into by sending an empty string.
 */
export async function POST(request: Request) {
  if (!isStudioAuthConfigured()) {
    return NextResponse.json(
      { error: "Studio auth is not configured on the server." },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  if (!passwordMatches(password)) {
    // Deliberately vague, and identical for "wrong" and "empty".
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const { value, maxAge } = await createStudioSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(studioCookieName, value, {
    httpOnly: true, // never readable from JS, so XSS cannot lift it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/studio",
    maxAge,
  });
  return response;
}

/** Sign out — clears the cookie. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(studioCookieName, "", { path: "/studio", maxAge: 0 });
  return response;
}
