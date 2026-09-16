import type { sheets_v4 } from "googleapis";
import { ALL_SHEET_TITLES } from "@/modules/google-sync/mappings";

export async function ensureSheetTabs(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  titles: readonly string[] = ALL_SHEET_TITLES,
) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = new Set(
    meta.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean) ?? [],
  );

  const missing = titles.filter((title) => !existing.has(title));
  if (missing.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({
        addSheet: { properties: { title } },
      })),
    },
  });
}

export async function readSheetRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
): Promise<{ headers: string[]; rows: unknown[][] }> {
  const range = `'${title}'!A:Z`;
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = response.data.values ?? [];
  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  const [headerRow, ...rows] = values;
  return {
    headers: headerRow?.map((value) => String(value ?? "").trim()) ?? [],
    rows,
  };
}

export async function writeSheetRows(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  title: string,
  rows: unknown[][],
) {
  await ensureSheetTabs(sheets, spreadsheetId, [title]);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `'${title}'!A:Z`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${title}'!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: rows },
  });
}

export async function createDashboardSpreadsheet(sheets: sheets_v4.Sheets) {
  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: "Дашборд · учёт работ и денег",
      },
      sheets: ALL_SHEET_TITLES.map((title) => ({
        properties: { title },
      })),
    },
  });

  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error("Google не вернул ID таблицы");
  }
  return spreadsheetId;
}
