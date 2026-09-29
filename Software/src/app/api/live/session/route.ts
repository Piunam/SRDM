import { NextResponse } from "next/server";
import { credentialsMatch, isLiveConfigured, issueSession, LIVE_COOKIE, SESSION_SECONDS } from "@/lib/live/session";

// node:crypto in session.ts.
export const runtime = "nodejs";

const cookieBase = {
  name: LIVE_COOKIE,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

/** Unlock. The credentials stay on the server; the reply carries only a flag. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Malformed request" }, { status: 400 });
  }

  const { accessId, passphrase } = (body ?? {}) as Record<string, unknown>;
  if (typeof accessId !== "string" || typeof passphrase !== "string") {
    return NextResponse.json({ ok: false, error: "Malformed request" }, { status: 400 });
  }

  if (!isLiveConfigured()) {
    return NextResponse.json({ ok: false, error: "Live access is not configured on this server" }, { status: 503 });
  }

  if (!credentialsMatch(accessId, passphrase)) {
    // One message for both fields: which one was wrong is not disclosed.
    return NextResponse.json({ ok: false, error: "Access denied" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...cookieBase, value: issueSession(), maxAge: SESSION_SECONDS });
  return response;
}

/** Sign out. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({ ...cookieBase, value: "", maxAge: 0 });
  return response;
}
