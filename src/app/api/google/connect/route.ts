import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_SHEETS_SCOPES,
  createGoogleOAuthClient,
  getGoogleOAuthSettings,
} from "@/lib/google/oauth";

function accessUrl(path: string) {
  const base = (process.env.AUTH_URL ?? "http://127.0.0.1:5001").replace(/\/$/, "");
  return new URL(path, `${base}/`);
}

export async function GET() {
  await requireAccess("owner");

  const settings = await getGoogleOAuthSettings();
  if (!settings.configured) {
    return NextResponse.redirect(accessUrl("/access?google=need-setup"));
  }

  const state = crypto.randomUUID();
  const jar = await cookies();
  jar.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
    secure: process.env.AUTH_URL?.startsWith("https://") ?? false,
  });

  const client = await createGoogleOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [...GOOGLE_SHEETS_SCOPES],
    state,
  });

  return NextResponse.redirect(url);
}
