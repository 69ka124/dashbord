import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_sheets_oauth_state";

export const GOOGLE_SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

export function getGoogleOAuthRedirectUri() {
  const base = (process.env.AUTH_URL ?? "").replace(/\/$/, "");
  if (!base) {
    throw new Error("Не задан AUTH_URL — без него Google не вернёт обратно в дашборд");
  }
  return `${base}/api/google/callback`;
}

export async function getGoogleOAuthSettings() {
  const config = await prisma.googleSyncConfig.findUnique({
    where: { id: "default" },
    select: { oauthClientId: true, oauthClientSecret: true },
  });

  const clientId = config?.oauthClientId?.trim() || process.env.AUTH_GOOGLE_ID?.trim() || "";
  const clientSecret =
    config?.oauthClientSecret?.trim() || process.env.AUTH_GOOGLE_SECRET?.trim() || "";

  const base = (process.env.AUTH_URL ?? "").replace(/\/$/, "");

  return {
    clientId,
    clientSecret,
    configured: Boolean(clientId && clientSecret),
    redirectUri: getGoogleOAuthRedirectUri(),
    connectHref: base ? `${base}/api/google/connect` : "/api/google/connect",
  };
}

export async function saveGoogleOAuthClient(clientId: string, clientSecret: string) {
  const id = clientId.trim();
  const secret = clientSecret.trim();
  if (!id || !secret) {
    throw new Error("Укажите Client ID и Client Secret из Google Cloud");
  }

  await prisma.googleSyncConfig.upsert({
    where: { id: "default" },
    create: { id: "default", oauthClientId: id, oauthClientSecret: secret },
    update: { oauthClientId: id, oauthClientSecret: secret },
  });
}

export async function createGoogleOAuthClient() {
  const { clientId, clientSecret, configured } = await getGoogleOAuthSettings();
  if (!configured) {
    throw new Error("Сначала сохраните ключи Google на странице «Доступ».");
  }

  return new google.auth.OAuth2(clientId, clientSecret, getGoogleOAuthRedirectUri());
}
