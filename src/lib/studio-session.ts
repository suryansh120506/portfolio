/**
 * Signed session cookie for the /studio gate.
 *
 * Uses Web Crypto (`crypto.subtle`) rather than `node:crypto` because this
 * runs inside Next middleware, which executes on the Edge runtime where the
 * node module is unavailable.
 *
 * The cookie is `<expiry>.<hmac>`. There is no user identity in it — this is
 * a single-operator gate — so the payload is just the expiry, signed so it
 * cannot be extended by editing the cookie. Verification is constant-time.
 *
 * WHAT THIS DOES AND DOES NOT PROTECT, stated plainly:
 *   - It hides the Studio UI from anyone without the password. That is all
 *     it is for.
 *   - It does NOT protect the Sanity dataset. Sanity authorises reads and
 *     writes against its own login and tokens, independently of this app.
 *     Someone with Sanity credentials reaches the content through Sanity's
 *     API whether or not they can load this route. Treat this as a lock on
 *     the front door, not on the filing cabinet.
 */

const COOKIE_NAME = "studio_session";
/** Eight hours — long enough for an editing session, short enough to expire. */
const TTL_MS = 8 * 60 * 60 * 1000;

export const studioCookieName = COOKIE_NAME;

function secret(): string {
  // Falls back to ADMIN_TOKEN so there is one password to remember; the
  // existing media panel already uses it.
  return process.env.STUDIO_SECRET ?? process.env.ADMIN_TOKEN ?? "";
}

/** The password a visitor must type. Same source as the media panel. */
export function studioPassword(): string {
  return process.env.STUDIO_PASSWORD ?? process.env.ADMIN_TOKEN ?? "";
}

export function isStudioAuthConfigured(): boolean {
  return studioPassword().trim().length > 0 && secret().trim().length > 0;
}

async function sign(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Length-independent comparison, so a mismatch leaks no timing signal. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createStudioSession(): Promise<{
  value: string;
  maxAge: number;
}> {
  const expiry = String(Date.now() + TTL_MS);
  return {
    value: `${expiry}.${await sign(expiry)}`,
    maxAge: Math.floor(TTL_MS / 1000),
  };
}

export async function verifyStudioSession(
  cookie: string | undefined,
): Promise<boolean> {
  if (!cookie || !isStudioAuthConfigured()) return false;

  const separator = cookie.lastIndexOf(".");
  if (separator < 1) return false;

  const expiry = cookie.slice(0, separator);
  const mac = cookie.slice(separator + 1);

  // Check the signature before trusting the expiry — an unsigned cookie's
  // timestamp means nothing.
  if (!safeEqual(mac, await sign(expiry))) return false;

  const expiresAt = Number(expiry);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/** Constant-time password check, for the login route. */
export function passwordMatches(candidate: string): boolean {
  const expected = studioPassword();
  if (!expected) return false;
  return safeEqual(candidate, expected);
}
