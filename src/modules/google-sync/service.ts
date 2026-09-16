import { GoogleSyncError, getGoogleSheetsClient, hasGoogleSheetsAccess } from "@/lib/google/auth-client";
import {
  getGoogleSyncConfig,
  markSyncError,
  markSyncSuccess,
  saveSpreadsheetReference,
  setSpreadsheetId,
} from "@/modules/google-sync/config";
import {
  archiveFromGoogleApi,
  archiveFromXlsx,
  downloadPublicSpreadsheetXlsx,
  saveSpreadsheetArchive,
  sheetLoaderFromArchive,
} from "@/modules/google-sync/archive";
import { createDashboardSpreadsheet } from "@/modules/google-sync/sheets";
import { importFromSheetLoader, pushToGoogleSheets } from "@/modules/google-sync/sync-data";

export type SyncSummary = {
  income: number;
  expense: number;
  counterparty: number;
  purchase: number;
  archivedSheets: number;
  archivedRows: number;
  extraSheets: string[];
};

async function requireSpreadsheetId() {
  const config = await getGoogleSyncConfig();
  if (!config.spreadsheetId) {
    throw new GoogleSyncError(
      "NO_SPREADSHEET",
      "Сначала укажите ссылку на Google Таблицу или создайте новую.",
    );
  }
  return config.spreadsheetId;
}

export async function saveGoogleSpreadsheet(userId: string, input: string) {
  if (!input.trim()) {
    throw new GoogleSyncError("INVALID_URL", "Укажите ссылку на Google Таблицу");
  }

  await saveSpreadsheetReference(input);
  if (!(await hasGoogleSheetsAccess(userId))) return;

  const spreadsheetId = await requireSpreadsheetId();
  const sheets = await getGoogleSheetsClient(userId);
  await sheets.spreadsheets.get({ spreadsheetId });
}

export async function createGoogleSpreadsheet(userId: string) {
  const sheets = await getGoogleSheetsClient(userId);
  const spreadsheetId = await createDashboardSpreadsheet(sheets);
  await setSpreadsheetId(spreadsheetId);
  await pushToGoogleSheets(sheets, spreadsheetId);
  await markSyncSuccess("push");
  return spreadsheetId;
}

export async function importGoogleSpreadsheet(userId: string, input?: string): Promise<SyncSummary> {
  if (input?.trim()) {
    await saveGoogleSpreadsheet(userId, input);
  }

  try {
    const config = await getGoogleSyncConfig();
    const spreadsheetId = await requireSpreadsheetId();

    let archive;
    let xlsx: Buffer | undefined;
    try {
      xlsx = await downloadPublicSpreadsheetXlsx(spreadsheetId);
      archive = await archiveFromXlsx(xlsx);
    } catch (publicError) {
      const canUseApi = await hasGoogleSheetsAccess(userId);
      if (!canUseApi) {
        const message =
          publicError instanceof Error
            ? publicError.message
            : "Не удалось скачать таблицу";
        throw new GoogleSyncError(
          "API_ERROR",
          message.includes("закрыта") || message.includes("ссылка")
            ? message
            : "Не удалось открыть таблицу. В Google: доступ «все, у кого есть ссылка» → «Читатель», затем повторите.",
        );
      }
      const sheets = await getGoogleSheetsClient(userId);
      archive = await archiveFromGoogleApi(sheets, spreadsheetId);
    }

    const snapshot = await saveSpreadsheetArchive({
      spreadsheetId,
      spreadsheetUrl: config.spreadsheetUrl,
      archive,
      xlsx,
    });
    const mapped = await importFromSheetLoader(sheetLoaderFromArchive(archive.sheets));
    await markSyncSuccess("pull");

    return {
      ...mapped,
      archivedSheets: snapshot.sheetCount,
      archivedRows: snapshot.rowCount,
      extraSheets: snapshot.extraSheets ? snapshot.extraSheets.split(", ").filter(Boolean) : [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка переноса";
    await markSyncError(message);
    throw error;
  }
}

export async function pullGoogleSheets(userId: string): Promise<SyncSummary> {
  return importGoogleSpreadsheet(userId);
}

export async function pushGoogleSheets(userId: string): Promise<SyncSummary> {
  try {
    const spreadsheetId = await requireSpreadsheetId();
    const sheets = await getGoogleSheetsClient(userId);
    const summary = await pushToGoogleSheets(sheets, spreadsheetId);
    await markSyncSuccess("push");
    return { ...summary, archivedSheets: 0, archivedRows: 0, extraSheets: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка выгрузки";
    await markSyncError(message);
    throw error;
  }
}

export async function syncGoogleSheets(userId: string): Promise<{ pull: SyncSummary; push: SyncSummary }> {
  const pull = await pullGoogleSheets(userId);
  const push = await pushGoogleSheets(userId);
  return { pull, push };
}
