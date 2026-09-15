import { NextResponse } from "next/server";

/**
 * Single-operator gate, shared by every write endpoint.
 *
 * The secret lives only on the server, so it never ships in the bundle and a
 * visitor cannot discover it by reading the page. Anyone holding the token is
 * you — this is deliberately not a user system.
 */

/** Constant-time compare — `===` leaks the secret through response timing. */
function tokensMatch(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) {
    diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Returns a response to send back when refused, or `null` when authorised. */
export function requireAdmin(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    // Fail closed: an unset secret must never mean "open to everyone".
    return NextResponse.json(
      { error: "ADMIN_TOKEN is not configured on the server." },
      { status: 503 },
    );
  }

  const given = request.headers.get("x-admin-token") ?? "";
  if (!tokensMatch(given, expected)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  return null;
}
