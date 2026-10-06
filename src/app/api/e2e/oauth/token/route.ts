import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { isE2eOAuthEnabled, readE2eOAuthCode } from "@/lib/e2e-oauth";

// The fake provider's token endpoint (seeded e2e only): exchanges the
// authorize code for a Bearer token. The token carries no privileges — it is
// the signed code itself, and the userinfo endpoint re-verifies it.
const E2E_OAUTH_ACCESS_TOKEN_TTL_S = 10 * 60;

export async function POST(request: Request) {
  if (!isE2eOAuthEnabled()) return NextResponse.json({ error: "not found" }, { status: 404 });
  let code: string | null = null;
  let grantType: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { code?: unknown; grant_type?: unknown };
      code = typeof body.code === "string" ? body.code : null;
      grantType = typeof body.grant_type === "string" ? body.grant_type : null;
    } else {
      const form = await request.formData();
      const rawCode = form.get("code");
      const rawGrant = form.get("grant_type");
      code = typeof rawCode === "string" ? rawCode : null;
      grantType = typeof rawGrant === "string" ? rawGrant : null;
    }
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (grantType !== "authorization_code" || !code) {
    return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
  }
  if (!readE2eOAuthCode(code, env.BETTER_AUTH_SECRET)) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }
  return NextResponse.json({
    access_token: code,
    token_type: "Bearer",
    expires_in: E2E_OAUTH_ACCESS_TOKEN_TTL_S,
  });
}
