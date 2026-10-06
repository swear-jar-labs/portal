import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { isE2eFakeOAuthProvider, isE2eOAuthEnabled, mintE2eOAuthCode } from "@/lib/e2e-oauth";

// The fake provider's authorization endpoint (seeded e2e only): Better Auth
// sends the standard query (client_id, redirect_uri, response_type, scope,
// state, code_challenge, ...). The loopback issuer trusts every sign-in, so
// it mints a code immediately and returns the browser to redirect_uri with
// the state echoed back — the rest of the handshake (token, userinfo,
// callback, session) is the real library code path.
type AuthorizeParams = {
  params: Promise<{ provider: string }>;
};

export async function GET(request: Request, { params }: AuthorizeParams) {
  if (!isE2eOAuthEnabled()) return NextResponse.json({ error: "not found" }, { status: 404 });
  const { provider } = await params;
  if (!isE2eFakeOAuthProvider(provider)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }
  const query = new URL(request.url).searchParams;
  const redirectUri = query.get("redirect_uri");
  const state = query.get("state");
  if (!redirectUri || !state) {
    return NextResponse.json({ error: "missing redirect_uri or state" }, { status: 400 });
  }
  let callback: URL;
  try {
    callback = new URL(redirectUri);
  } catch {
    return NextResponse.json({ error: "invalid redirect_uri" }, { status: 400 });
  }
  callback.searchParams.set("code", mintE2eOAuthCode(provider, env.BETTER_AUTH_SECRET));
  callback.searchParams.set("state", state);
  return NextResponse.redirect(callback);
}
