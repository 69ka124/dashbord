import { prisma } from "@/lib/prisma";
import { extractSpreadsheetId, spreadsheetUrl } from "@/lib/google/spreadsheet-id";

export async function getGoogleSyncConfig() {
  return prisma.googleSyncConfig.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
}

export async function saveSpreadsheetReference(input: string) {
  const spreadsheetId = extractSpreadsheetId(input);
  if (!spreadsheetId) {
    throw new Error("Укажите ссылку на Google Таблицу или её ID");
  }

  return prisma.googleSyncConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      spreadsheetId,
      spreadsheetUrl: input.includes("docs.google.com") ? input.trim() : spreadsheetUrl(spreadsheetId),
      lastError: null,
    },
    update: {
      spreadsheetId,
      spreadsheetUrl: input.includes("docs.google.com") ? input.trim() : spreadsheetUrl(spreadsheetId),
      lastError: null,
    },
  });
}

export async function markSyncSuccess(kind: "pull" | "push") {
  return prisma.googleSyncConfig.update({
    where: { id: "default" },
    data: {
      ...(kind === "pull" ? { lastPullAt: new Date() } : { lastPushAt: new Date() }),
      lastError: null,
    },
  });
}

export async function markSyncError(message: string) {
  return prisma.googleSyncConfig.update({
    where: { id: "default" },
    data: { lastError: message.slice(0, 500) },
  });
}

export async function setSpreadsheetId(spreadsheetId: string) {
  return prisma.googleSyncConfig.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      spreadsheetId,
      spreadsheetUrl: spreadsheetUrl(spreadsheetId),
      lastError: null,
    },
    update: {
      spreadsheetId,
      spreadsheetUrl: spreadsheetUrl(spreadsheetId),
      lastError: null,
    },
  });
}
