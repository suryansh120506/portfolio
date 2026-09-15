import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Password check for the studio panel.
 *
 * This exists purely so the UI can decide whether to reveal its controls. It
 * grants nothing on its own — every write endpoint re-checks the password
 * independently, so skipping this call (or lying about its result in the
 * browser) still gets you a 401 from the endpoint that actually matters.
 */
export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  return NextResponse.json({ ok: true });
}
