import { google } from "googleapis";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  createGoogleOAuthClient,
} from "@/lib/google/oauth";

function accessUrl(path: string) {
  const base = (process.env.AUTH_URL ?? "http://127.0.0.1:5001").replace(/\/$/, "");
  return new URL(path, `${base}/`);
}

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const error = incoming.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(accessUrl("/access?google=denied"));
  }

  const code = incoming.searchParams.get("code");
  const state = incoming.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  jar.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(accessUrl("/access?google=error"));
  }

  try {
    const client = await createGoogleOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      const existing = await prisma.googleSyncConfig.findUnique({
        where: { id: "default" },
        select: { refreshToken: true },
      });
      if (!existing?.refreshToken) {
        return NextResponse.redirect(accessUrl("/access?google=no-refresh"));
      }
    }

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();

    await prisma.googleSyncConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        googleEmail: me.data.email ?? null,
        refreshToken: tokens.refresh_token ?? null,
        accessToken: tokens.access_token ?? null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        lastError: null,
      },
      update: {
        googleEmail: me.data.email ?? null,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        accessToken: tokens.access_token ?? null,
        tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        lastError: null,
      },
    });

    return NextResponse.redirect(accessUrl("/access?google=connected"));
  } catch {
    return NextResponse.redirect(accessUrl("/access?google=error"));
  }
}
