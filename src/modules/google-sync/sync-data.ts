import type { sheets_v4 } from "googleapis";
import { prisma } from "@/lib/prisma";
import {
  createCounterparty,
  listCounterparties,
  updateCounterparty,
} from "@/modules/catalog/service";
import { createExpenseRecord, updateExpenseRecord } from "@/modules/expense/service";
import { createIncomeRecord, updateIncomeRecord } from "@/modules/income/service";
import {
  createPurchaseItem,
  listPurchaseItems,
  updatePurchaseItem,
} from "@/modules/purchases/service";
import {
  COUNTERPARTY_HEADERS,
  EXPENSE_HEADERS,
  INCOME_HEADERS,
  PURCHASE_HEADERS,
  SHEET_TABS,
} from "@/modules/google-sync/mappings";
import {
  formatSheetDate,
  parseOptionalInt,
  parseSheetDate,
  parseSheetNumber,
  pickField,
  rowToMap,
} from "@/modules/google-sync/parse";
import { readSheetRows, writeSheetRows } from "@/modules/google-sync/sheets";

function isDataRow(map: Record<string, string>, idKeys: string[]): boolean {
  const id = pickField(map, ...idKeys);
  const hasOther = Object.values(map).some(Boolean);
  return Boolean(id || hasOther);
}

type TabLoader = (title: string) => Promise<{ headers: string[]; rows: unknown[][] }>;

export async function importFromSheetLoader(loadTab: TabLoader) {
  const counts = { income: 0, expense: 0, counterparty: 0, purchase: 0 };
  counts.income += await importIncomeSheet(await loadTab(SHEET_TABS.income));
  counts.counterparty += await importCounterpartySheet(await loadTab(SHEET_TABS.counterparty));
  counts.expense += await importExpenseSheet(await loadTab(SHEET_TABS.expense));
  counts.purchase += await importPurchaseSheet(await loadTab(SHEET_TABS.purchase));
  return counts;
}

export async function pullFromGoogleSheets(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<{ income: number; expense: number; counterparty: number; purchase: number }> {
  return importFromSheetLoader((title) => readSheetRows(sheets, spreadsheetId, title));
}

async function importIncomeSheet({ headers, rows }: { headers: string[]; rows: unknown[][] }) {
  if (headers.length === 0) return 0;

  let count = 0;
  for (const row of rows) {
    const map = rowToMap(headers, row);
    if (!isDataRow(map, ["ID", "id"])) continue;

    const incomeCode = pickField(map, "ID", "id");
    const receivedAt = parseSheetDate(pickField(map, "Дата"));
    if (!receivedAt) continue;

    const payload = {
      incomeCode: incomeCode || undefined,
      receivedAt,
      incomeKind: pickField(map, "Вид") || "услуги",
      payer: pickField(map, "Плательщик"),
      project: pickField(map, "Проект"),
      amount: parseSheetNumber(pickField(map, "Сумма")),
      status: pickField(map, "Статус") || "план",
      documents: pickField(map, "Документы") || undefined,
      source: pickField(map, "Источник") || undefined,
    };

    if (!payload.payer && !payload.project) continue;

    const existing = incomeCode
      ? await prisma.incomeRecord.findUnique({ where: { incomeCode } })
      : null;

    if (existing) {
      await updateIncomeRecord(existing.id, payload);
    } else {
      await createIncomeRecord(payload);
    }
    count += 1;
  }

  return count;
}

async function importCounterpartySheet({ headers, rows }: { headers: string[]; rows: unknown[][] }) {
  if (headers.length === 0) return 0;

  const existing = await listCounterparties();
  const byCode = new Map(existing.filter((row) => row.code).map((row) => [row.code!, row]));
  const byName = new Map(existing.map((row) => [row.name.trim().toLowerCase(), row]));

  let count = 0;
  for (const row of rows) {
    const map = rowToMap(headers, row);
    if (!isDataRow(map, ["ID", "id", "Название"])) continue;

    const name = pickField(map, "Название");
    if (!name) continue;

    const code = pickField(map, "ID", "id") || undefined;
    const payload = {
      code,
      name,
      inn: pickField(map, "ИНН") || undefined,
      mainCategory: pickField(map, "Категория") || undefined,
      responsible: pickField(map, "Ответственный") || undefined,
      status: pickField(map, "Статус") || "активен",
      comment: pickField(map, "Комментарий") || undefined,
    };

    const match =
      (code ? byCode.get(code) : undefined) ?? byName.get(name.trim().toLowerCase());

    if (match) {
      await updateCounterparty(match.id, payload);
    } else {
      await createCounterparty(payload);
    }
    count += 1;
  }

  return count;
}

async function importExpenseSheet({ headers, rows }: { headers: string[]; rows: unknown[][] }) {
  if (headers.length === 0) return 0;

  let count = 0;
  for (const row of rows) {
    const map = rowToMap(headers, row);
    if (!isDataRow(map, ["ID", "id"])) continue;

    const expenseCode = pickField(map, "ID", "id");
    const registeredAt = parseSheetDate(pickField(map, "Дата рег.", "Дата"));
    if (!registeredAt) continue;

    const amount = parseSheetNumber(pickField(map, "Сумма"));
    const totalToPay = parseSheetNumber(pickField(map, "К оплате")) || amount;

    const payload = {
      expenseCode: expenseCode || undefined,
      recipient: pickField(map, "Получатель"),
      task: pickField(map, "Задача"),
      project: pickField(map, "Проект"),
      category: pickField(map, "Категория") || "подряд",
      registeredAt,
      workStatus: pickField(map, "Статус работы") || "в работе",
      paymentStatus: pickField(map, "Статус оплаты") || "не оплачено",
      amount,
      totalToPay,
      plannedPayQuarter: parseOptionalInt(pickField(map, "Квартал оплаты")),
      paidAt: parseSheetDate(pickField(map, "Оплачено")),
      dueDate: parseSheetDate(pickField(map, "Срок")),
      jiraUrl: pickField(map, "Jira") || undefined,
      comment: pickField(map, "Комментарий") || undefined,
    };

    if (!payload.recipient && !payload.task && !payload.project) continue;

    const existing = expenseCode
      ? await prisma.expenseRecord.findUnique({ where: { expenseCode } })
      : null;

    if (existing) {
      await updateExpenseRecord(existing.id, payload);
    } else {
      await createExpenseRecord(payload);
    }
    count += 1;
  }

  return count;
}

async function importPurchaseSheet({ headers, rows }: { headers: string[]; rows: unknown[][] }) {
  if (headers.length === 0) return 0;

  const existing = await listPurchaseItems();
  const byId = new Map(existing.map((row) => [row.id, row]));

  let count = 0;
  for (const row of rows) {
    const map = rowToMap(headers, row);
    if (!isDataRow(map, ["ID", "id", "Название"])) continue;

    const title = pickField(map, "Название");
    if (!title) continue;

    const id = pickField(map, "ID", "id");
    const payload = {
      type: pickField(map, "Тип") || "прочее",
      title,
      comment: pickField(map, "Комментарий") || undefined,
      paymentDate: parseSheetDate(pickField(map, "Дата оплаты")),
      unitPrice: parseSheetNumber(pickField(map, "Цена")),
      quantity: parseSheetNumber(pickField(map, "Кол-во")) || 1,
      subscription: pickField(map, "Подписка") || undefined,
      priority: pickField(map, "Приоритет") || "средний",
      status: pickField(map, "Статус") || "план",
    };

    const match = id ? byId.get(id) : undefined;
    if (match) {
      await updatePurchaseItem(match.id, payload);
    } else {
      await createPurchaseItem(payload);
    }
    count += 1;
  }

  return count;
}

export async function pushToGoogleSheets(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
): Promise<{ income: number; expense: number; counterparty: number; purchase: number }> {
  const income = await pushIncomeSheet(sheets, spreadsheetId);
  const counterparty = await pushCounterpartySheet(sheets, spreadsheetId);
  const expense = await pushExpenseSheet(sheets, spreadsheetId);
  const purchase = await pushPurchaseSheet(sheets, spreadsheetId);
  return { income, expense, counterparty, purchase };
}

async function pushIncomeSheet(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  const rows = await prisma.incomeRecord.findMany({
    orderBy: [{ receivedAt: "asc" }, { incomeCode: "asc" }],
  });

  const values: unknown[][] = [
    [...INCOME_HEADERS],
    ...rows.map((row) => [
      row.incomeCode,
      formatSheetDate(row.receivedAt),
      row.incomeKind,
      row.payer,
      row.project,
      Number(row.amount),
      row.status,
      row.documents ?? "",
      row.source ?? "",
    ]),
  ];

  await writeSheetRows(sheets, spreadsheetId, SHEET_TABS.income, values);
  return rows.length;
}

async function pushCounterpartySheet(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  const rows = await listCounterparties();

  const values: unknown[][] = [
    [...COUNTERPARTY_HEADERS],
    ...rows.map((row) => [
      row.code ?? "",
      row.name,
      row.inn ?? "",
      row.mainCategory ?? "",
      row.responsible ?? "",
      row.status,
      row.comment ?? "",
    ]),
  ];

  await writeSheetRows(sheets, spreadsheetId, SHEET_TABS.counterparty, values);
  return rows.length;
}

async function pushExpenseSheet(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  const rows = await prisma.expenseRecord.findMany({
    orderBy: [{ registeredAt: "asc" }, { expenseCode: "asc" }],
  });

  const values: unknown[][] = [
    [...EXPENSE_HEADERS],
    ...rows.map((row) => [
      row.expenseCode,
      formatSheetDate(row.registeredAt),
      row.recipient,
      row.task,
      row.project,
      row.category,
      row.workStatus,
      row.paymentStatus,
      Number(row.amount),
      Number(row.totalToPay),
      row.plannedPayQuarter ?? "",
      formatSheetDate(row.paidAt),
      formatSheetDate(row.dueDate),
      row.jiraUrl ?? "",
      row.comment ?? "",
    ]),
  ];

  await writeSheetRows(sheets, spreadsheetId, SHEET_TABS.expense, values);
  return rows.length;
}

async function pushPurchaseSheet(sheets: sheets_v4.Sheets, spreadsheetId: string) {
  const rows = await listPurchaseItems();

  const values: unknown[][] = [
    [...PURCHASE_HEADERS],
    ...rows.map((row) => [
      row.id,
      row.type,
      row.title,
      formatSheetDate(row.paymentDate),
      row.unitPrice,
      row.quantity,
      row.lineTotal,
      row.subscription ?? "",
      row.priority,
      row.status,
      row.comment ?? "",
    ]),
  ];

  await writeSheetRows(sheets, spreadsheetId, SHEET_TABS.purchase, values);
  return rows.length;
}
