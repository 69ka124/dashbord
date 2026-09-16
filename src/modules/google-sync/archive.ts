import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { sheets_v4 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { GoogleSyncError } from "@/lib/google/auth-client";
import { SHEET_TABS } from "@/modules/google-sync/mappings";

export type ArchivedSheet = {
  title: string;
  headers: string[];
  rows: unknown[][];
};

export type SpreadsheetArchive = {
  source: "xlsx" | "api";
  sheets: ArchivedSheet[];
  fileName?: string;
};

const KNOWN_TABS = new Set<string>(Object.values(SHEET_TABS));

export function archiveStats(sheets: ArchivedSheet[]) {
  const rowCount = sheets.reduce((sum, sheet) => sum + sheet.rows.length, 0);
  const extraSheets = sheets.map((sheet) => sheet.title).filter((title) => !KNOWN_TABS.has(title));
  return { sheetCount: sheets.length, rowCount, extraSheets };
}

export function sheetLoaderFromArchive(sheets: ArchivedSheet[]) {
  const byTitle = new Map(sheets.map((sheet) => [sheet.title, sheet]));
  return async (title: string) => {
    const sheet = byTitle.get(title);
    if (!sheet) return { headers: [], rows: [] };
    return { headers: sheet.headers, rows: sheet.rows };
  };
}

function importsDir() {
  return path.join(process.cwd(), "data", "imports");
}

function workbookToSheets(buffer: Buffer): ArchivedSheet[] {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false, cellDates: false });
  return workbook.SheetNames.map((title) => {
    const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(workbook.Sheets[title]!, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: true,
    });
    const [headerRow, ...rows] = matrix;
    return {
      title,
      headers: (headerRow ?? []).map((value) => String(value ?? "").trim()),
      rows: rows.map((row) => (row ?? []).map((value) => String(value ?? ""))),
    };
  });
}

function looksPrivate(text: string, url: string) {
  return (
    url.includes("accounts.google.com") ||
    /<html/i.test(text.slice(0, 400)) ||
    text.includes("ServiceLogin")
  );
}

export async function downloadPublicSpreadsheetXlsx(spreadsheetId: string): Promise<Buffer> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
  const response = await fetch(url, { redirect: "follow" });
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("text/html")) {
    const text = await response.text();
    if (looksPrivate(text, response.url)) {
      throw new GoogleSyncError(
        "API_ERROR",
        "Таблица закрыта. Откройте доступ «все, у кого есть ссылка» (просмотр).",
      );
    }
    throw new GoogleSyncError("API_ERROR", "Google не отдал файл таблицы.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (!response.ok || buffer.length < 32) {
    throw new GoogleSyncError(
      "API_ERROR",
      "Таблица закрыта. Откройте доступ «все, у кого есть ссылка» (просмотр).",
    );
  }

  return buffer;
}

export async function archiveFromXlsx(buffer: Buffer): Promise<SpreadsheetArchive> {
  return { source: "xlsx", sheets: workbookToSheets(buffer) };
}

export async function archiveFromGoogleApi(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<SpreadsheetArchive> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const titles =
    meta.data.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)) ?? [];

  const archived: ArchivedSheet[] = [];
  for (const title of titles) {
    const range = `'${title.replaceAll("'", "''")}'`;
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: "FORMATTED_VALUE",
    });
    const values = response.data.values ?? [];
    const [headerRow, ...rows] = values;
    archived.push({
      title,
      headers: (headerRow ?? []).map((value) => String(value ?? "").trim()),
      rows,
    });
  }

  return { source: "api", sheets: archived };
}

export async function saveSpreadsheetArchive(input: {
  spreadsheetId: string;
  spreadsheetUrl?: string | null;
  archive: SpreadsheetArchive;
  xlsx?: Buffer;
}) {
  const stats = archiveStats(input.archive.sheets);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = importsDir();
  await mkdir(dir, { recursive: true });

  let fileName: string | undefined;
  if (input.xlsx) {
    fileName = `${stamp}-${input.spreadsheetId}.xlsx`;
    await writeFile(path.join(dir, fileName), input.xlsx);
  }

  const jsonName = `${stamp}-${input.spreadsheetId}.json`;
  await writeFile(
    path.join(dir, jsonName),
    JSON.stringify(
      {
        spreadsheetId: input.spreadsheetId,
        spreadsheetUrl: input.spreadsheetUrl ?? null,
        source: input.archive.source,
        savedAt: new Date().toISOString(),
        sheets: input.archive.sheets,
      },
      null,
      2,
    ),
    "utf8",
  );

  return prisma.googleSheetSnapshot.create({
    data: {
      spreadsheetId: input.spreadsheetId,
      spreadsheetUrl: input.spreadsheetUrl ?? null,
      source: input.archive.source,
      sheetCount: stats.sheetCount,
      rowCount: stats.rowCount,
      extraSheets: stats.extraSheets.join(", ") || null,
      fileName: fileName ?? jsonName,
      payload: JSON.stringify(input.archive.sheets),
    },
  });
}

export async function getLatestSpreadsheetSnapshot() {
  return prisma.googleSheetSnapshot.findFirst({
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      sheetCount: true,
      rowCount: true,
      extraSheets: true,
      fileName: true,
      source: true,
    },
  });
}
