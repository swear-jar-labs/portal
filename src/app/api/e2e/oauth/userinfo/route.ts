import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { e2eOAuthProfile, isE2eOAuthEnabled, readE2eOAuthCode } from "@/lib/e2e-oauth";

// The fake provider's userinfo endpoint (seeded e2e only): vouches for the
// seeded fixture account behind the Bearer code token.
export async function GET(request: Request) {
  if (!isE2eOAuthEnabled()) return NextResponse.json({ error: "not found" }, { status: 404 });
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
  const provider = token ? readE2eOAuthCode(token, env.BETTER_AUTH_SECRET) : null;
  if (!provider) return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  return NextResponse.json(e2eOAuthProfile(provider));
}
