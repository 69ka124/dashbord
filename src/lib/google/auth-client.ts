import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { createGoogleOAuthClient } from "@/lib/google/oauth";

export class GoogleSyncError extends Error {
  constructor(
    public code: "NO_GOOGLE_TOKEN" | "NO_SPREADSHEET" | "INVALID_URL" | "API_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "GoogleSyncError";
  }
}

export async function hasGoogleSheetsAccess(_userId?: string): Promise<boolean> {
  const config = await prisma.googleSyncConfig.findUnique({
    where: { id: "default" },
    select: { refreshToken: true },
  });
  if (config?.refreshToken) return true;

  const account = await prisma.account.findFirst({
    where: { provider: "google" },
    select: { refresh_token: true },
  });
  return Boolean(account?.refresh_token);
}

async function persistConfigTokens(tokens: {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
}) {
  if (!tokens.access_token && !tokens.refresh_token) return;

  await prisma.googleSyncConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    update: {
      ...(tokens.access_token ? { accessToken: tokens.access_token } : {}),
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
      tokenExpiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
    },
  });
}

export async function getGoogleSheetsClient(_userId?: string) {
  const config = await prisma.googleSyncConfig.findUnique({
    where: { id: "default" },
  });

  const refreshToken =
    config?.refreshToken ||
    (
      await prisma.account.findFirst({
        where: { provider: "google" },
        select: { refresh_token: true, access_token: true },
      })
    )?.refresh_token;

  if (!refreshToken) {
    throw new GoogleSyncError(
      "NO_GOOGLE_TOKEN",
      "Сначала нажмите «Подключить» и разрешите доступ к Google Таблицам.",
    );
  }

  const oauth2Client = await createGoogleOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: config?.accessToken ?? undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    try {
      await persistConfigTokens(tokens);
    } catch {
      // token refresh must not crash a sync
    }
  });

  return google.sheets({ version: "v4", auth: oauth2Client });
}
