"use server";

import { revalidatePath } from "next/cache";
import { requireAccess } from "@/lib/access";
import { spreadsheetUrl } from "@/lib/google/spreadsheet-id";
import { saveGoogleOAuthClient } from "@/lib/google/oauth";
import {
  createGoogleSpreadsheet,
  importGoogleSpreadsheet,
  pullGoogleSheets,
  pushGoogleSheets,
  saveGoogleSpreadsheet,
  syncGoogleSheets,
} from "@/modules/google-sync/service";
import { DEFAULT_COUNTERPARTY_LIMIT } from "@/lib/codes";
import { parseMoney, parseMoneyOptional } from "@/lib/money";
import type { WorkModule, WorkStatus } from "@/modules/ledger/service";
import { auditAction, auditCreate, auditDelete } from "@/modules/audit/service";
import {
  createCounterparty,
  deleteCounterparty,
  deleteCounterpartyLimit,
  updateCounterparty,
  upsertCounterpartyLimit,
} from "@/modules/catalog/service";

async function requireEdit() {
  await requireAccess("edit");
}

async function logMutation(
  kind: "create" | "update" | "delete",
  tab: string,
  entityId: string,
  summary: string,
) {
  try {
    if (kind === "create") await auditCreate(tab, entityId || "—", summary);
    else if (kind === "delete") await auditDelete(tab, entityId || "—", summary);
    else await auditAction(tab, entityId || "—", "обновление", summary);
  } catch {
    // audit must not break business actions
  }
}

export async function createCounterpartyAction(formData: FormData) {
  await requireEdit();
  const name = String(formData.get("name") ?? "");
  const created = await createCounterparty({
    name,
    shortTabName: String(formData.get("shortTabName") ?? ""),
    recipientType: String(formData.get("recipientType") ?? ""),
    tabName: String(formData.get("tabName") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    inn: String(formData.get("inn") ?? ""),
    mainCategory: String(formData.get("mainCategory") ?? ""),
    contractFolder: String(formData.get("contractFolder") ?? ""),
    responsible: String(formData.get("responsible") ?? ""),
    limitControl: String(formData.get("limitControl") ?? ""),
    separateTab: formData.get("separateTab") === "on",
    status: String(formData.get("status") ?? "активен"),
    comment: String(formData.get("comment") ?? ""),
  });
  await logMutation("create", "Справочник К/А", created.id, name);
  revalidatePath("/counterparties");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateCounterpartyAction(formData: FormData) {
  await requireEdit();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  await updateCounterparty(id, {
    name,
    shortTabName: String(formData.get("shortTabName") ?? ""),
    recipientType: String(formData.get("recipientType") ?? ""),
    tabName: String(formData.get("tabName") ?? ""),
    legalName: String(formData.get("legalName") ?? ""),
    inn: String(formData.get("inn") ?? ""),
    mainCategory: String(formData.get("mainCategory") ?? ""),
    contractFolder: String(formData.get("contractFolder") ?? ""),
    responsible: String(formData.get("responsible") ?? ""),
    limitControl: String(formData.get("limitControl") ?? ""),
    separateTab: formData.get("separateTab") === "on",
    status: String(formData.get("status") ?? "активен"),
    comment: String(formData.get("comment") ?? ""),
  });
  await logMutation("update", "Справочник К/А", id, name);
  revalidatePath("/counterparties");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function deleteCounterpartyAction(formData: FormData) {
  await requireEdit();
  const id = String(formData.get("id") ?? "");
  await deleteCounterparty(id);
  await logMutation("delete", "Справочник К/А", id, id);
  revalidatePath("/counterparties");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function upsertCounterpartyLimitAction(formData: FormData) {
  await requireEdit();
  const counterpartyId = String(formData.get("counterpartyId") ?? "");
  const year = Number(formData.get("year") ?? new Date().getFullYear());
  await upsertCounterpartyLimit({ counterpartyId, year });
  await logMutation(
    "update",
    "Справочник К/А",
    counterpartyId,
    `лимит ${year}: ${DEFAULT_COUNTERPARTY_LIMIT}`,
  );
  revalidatePath("/counterparties");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function deleteCounterpartyLimitAction(formData: FormData) {
  await requireEdit();
  const id = String(formData.get("id") ?? "");
  await deleteCounterpartyLimit(id);
  await logMutation("delete", "Справочник К/А", id, `лимит ${id}`);
  revalidatePath("/counterparties");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function createWorkAction(formData: FormData) {
  await requireEdit();
  const { createWork } = await import("@/modules/ledger/service");
  const due = String(formData.get("dueDate") ?? "");
  const received = String(formData.get("receivedAt") ?? "");
  const title = String(formData.get("title") ?? "");
  let counterpartyId = String(formData.get("counterpartyId") ?? "") || null;
  const counterpartyName = String(formData.get("counterpartyName") ?? "").trim();

  if (!counterpartyId && counterpartyName) {
    const createdCounterparty = await createCounterparty({ name: counterpartyName });
    counterpartyId = createdCounterparty.id;
  }

  const created = await createWork({
    module: (String(formData.get("module") ?? "work") || "work") as WorkModule,
    title,
    amount: parseMoney(formData.get("amount")),
    status: String(formData.get("status") ?? "planned") as WorkStatus,
    dueDate: due ? new Date(due) : null,
    receivedAt: received ? new Date(received) : undefined,
    comment: String(formData.get("comment") ?? ""),
    workTypeName: String(formData.get("workTypeName") ?? ""),
    counterpartyId,
    counterpartyName,
    project: String(formData.get("project") ?? ""),
    client: String(formData.get("client") ?? ""),
    jiraUrl: String(formData.get("jiraUrl") ?? ""),
    ke: String(formData.get("ke") ?? ""),
    estimate: parseMoneyOptional(formData.get("estimate")),
    orderIncome: parseMoneyOptional(formData.get("orderIncome")),
    materials: String(formData.get("materials") ?? ""),
  });
  await logMutation("create", "Работы", created.id, title);
  revalidatePath("/works");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateWorkAction(formData: FormData) {
  await requireEdit();
  const { updateWork } = await import("@/modules/ledger/service");
  const id = String(formData.get("id") ?? "");
  const due = String(formData.get("dueDate") ?? "");
  const received = String(formData.get("receivedAt") ?? "");
  const title = String(formData.get("title") ?? "");
  await updateWork(id, {
    source: (String(formData.get("source") ?? "work") || "work") as WorkModule,
    title,
    amount: parseMoney(formData.get("amount")),
    status: String(formData.get("status") ?? "planned") as WorkStatus,
    dueDate: due ? new Date(due) : null,
    receivedAt: received ? new Date(received) : undefined,
    comment: String(formData.get("comment") ?? ""),
    workTypeName: String(formData.get("workTypeName") ?? ""),
    counterpartyId: String(formData.get("counterpartyId") ?? "") || null,
    project: String(formData.get("project") ?? ""),
    client: String(formData.get("client") ?? ""),
    jiraUrl: String(formData.get("jiraUrl") ?? ""),
    ke: String(formData.get("ke") ?? ""),
    estimate: parseMoneyOptional(formData.get("estimate")),
    orderIncome: parseMoneyOptional(formData.get("orderIncome")),
    materials: String(formData.get("materials") ?? ""),
  });
  await logMutation("update", "Работы", id, title);
  revalidatePath("/works");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function deleteWorkAction(formData: FormData) {
  await requireEdit();
  const { deleteWork } = await import("@/modules/ledger/service");
  const id = String(formData.get("id") ?? "");
  const source = (String(formData.get("source") ?? "work") || "work") as WorkModule;
  await deleteWork(id, source);
  await logMutation("delete", "Работы", id, id);
  revalidatePath("/works");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function createAccessGrantAction(formData: FormData) {
  await requireAccess("owner");
  const { createAccessGrant } = await import("@/modules/sharing/service");
  const email = String(formData.get("email") ?? "");
  const expires = String(formData.get("expiresAt") ?? "");
  const label = String(formData.get("label") ?? "");
  const created = await createAccessGrant({
    email,
    role: String(formData.get("role") ?? "view") as "view" | "edit",
    label,
    expiresAt: expires ? new Date(expires) : null,
  });
  await logMutation("create", "Доступ", created.id, created.email);
  revalidatePath("/access");
  revalidatePath("/history");
}

export async function revokeAccessGrantAction(formData: FormData) {
  await requireAccess("owner");
  const { revokeAccessGrant } = await import("@/modules/sharing/service");
  const id = String(formData.get("id") ?? "");
  await revokeAccessGrant(id);
  await logMutation("delete", "Доступ", id, "отозван");
  revalidatePath("/access");
  revalidatePath("/history");
}

function parseIncomeForm(formData: FormData) {
  const received = String(formData.get("receivedAt") ?? "");
  return {
    receivedAt: received ? new Date(received) : new Date(),
    incomeKind: String(formData.get("incomeKind") ?? ""),
    payer: String(formData.get("payer") ?? ""),
    project: String(formData.get("project") ?? ""),
    amount: parseMoney(formData.get("amount") || "0"),
    status: String(formData.get("status") ?? "план"),
    documents: String(formData.get("documents") ?? ""),
    source: String(formData.get("source") ?? ""),
  };
}

export async function createIncomeRecordAction(formData: FormData) {
  await requireEdit();
  const { createIncomeRecord } = await import("@/modules/income/service");
  const data = parseIncomeForm(formData);
  const created = await createIncomeRecord(data);
  await logMutation(
    "create",
    "Доходы",
    created.id,
    created.incomeCode || `${data.amount}`,
  );
  revalidatePath("/income");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateIncomeRecordAction(formData: FormData) {
  await requireEdit();
  const { updateIncomeRecord } = await import("@/modules/income/service");
  const id = String(formData.get("id") ?? "");
  const data = parseIncomeForm(formData);
  await updateIncomeRecord(id, data);
  await logMutation("update", "Доходы", id, id);
  revalidatePath("/income");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function deleteIncomeRecordAction(formData: FormData) {
  await requireEdit();
  const { deleteIncomeRecord } = await import("@/modules/income/service");
  const id = String(formData.get("id") ?? "");
  await deleteIncomeRecord(id);
  await logMutation("delete", "Доходы", id, id);
  revalidatePath("/income");
  revalidatePath("/");
  revalidatePath("/history");
}

function parseExpenseForm(formData: FormData) {
  const registered = String(formData.get("registeredAt") ?? "");
  const paidAt = String(formData.get("paidAt") ?? "");
  const plannedQ = String(formData.get("plannedPayQuarter") ?? "");
  return {
    recipient: String(formData.get("recipient") ?? ""),
    task: String(formData.get("task") ?? ""),
    project: String(formData.get("project") ?? ""),
    category: String(formData.get("category") ?? ""),
    registeredAt: registered ? new Date(registered) : new Date(),
    workStatus: String(formData.get("workStatus") ?? "в работе"),
    paymentStatus: String(formData.get("paymentStatus") ?? "не оплачено"),
    amount: parseMoney(formData.get("amount") || "0"),
    totalToPay: parseMoney(formData.get("totalToPay") || "0"),
    plannedPayQuarter: plannedQ ? Number(plannedQ) : null,
    paidAt: paidAt ? new Date(paidAt) : null,
    counterpartyId: String(formData.get("counterpartyId") ?? "") || null,
    jiraUrl: String(formData.get("jiraUrl") ?? ""),
    materialUrl: String(formData.get("materialUrl") ?? ""),
    documents: String(formData.get("documents") ?? ""),
    comment: String(formData.get("comment") ?? ""),
  };
}

export async function createExpenseRecordAction(formData: FormData) {
  await requireEdit();
  const { createExpenseRecord } = await import("@/modules/expense/service");
  const data = parseExpenseForm(formData);
  const created = await createExpenseRecord(data);
  await logMutation(
    "create",
    "Расходы",
    created.id,
    created.expenseCode || data.task || `${data.amount}`,
  );
  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function updateExpenseRecordAction(formData: FormData) {
  await requireEdit();
  const { updateExpenseRecord } = await import("@/modules/expense/service");
  const id = String(formData.get("id") ?? "");
  const data = parseExpenseForm(formData);
  await updateExpenseRecord(id, data);
  await logMutation("update", "Расходы", id, id);
  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function deleteExpenseRecordAction(formData: FormData) {
  await requireEdit();
  const { deleteExpenseRecord } = await import("@/modules/expense/service");
  const id = String(formData.get("id") ?? "");
  await deleteExpenseRecord(id);
  await logMutation("delete", "Расходы", id, id);
  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/history");
}

export async function createEmployeeAction(formData: FormData) {
  await requireEdit();
  const { createEmployee } = await import("@/modules/vacations/service");
  const fullName = String(formData.get("fullName") ?? "");
  const created = await createEmployee({
    fullName,
    role: String(formData.get("role") ?? ""),
  });
  await logMutation("create", "Отпуска", created.id, fullName);
  revalidatePath("/vacations");
  revalidatePath("/history");
}

export async function updateEmployeeAction(formData: FormData) {
  await requireEdit();
  const { updateEmployee } = await import("@/modules/vacations/service");
  const id = String(formData.get("id") ?? "");
  const fullName = String(formData.get("fullName") ?? "");
  await updateEmployee(id, {
    fullName,
    role: String(formData.get("role") ?? ""),
    active: formData.get("active") === "on",
  });
  await logMutation("update", "Отпуска", id, fullName);
  revalidatePath("/vacations");
  revalidatePath("/history");
}

export async function deleteEmployeeAction(formData: FormData) {
  await requireEdit();
  const { deleteEmployee } = await import("@/modules/vacations/service");
  const id = String(formData.get("id") ?? "");
  await deleteEmployee(id);
  await logMutation("delete", "Отпуска", id, id);
  revalidatePath("/vacations");
  revalidatePath("/history");
}

function parseLeaveForm(formData: FormData) {
  const start = String(formData.get("startDate") ?? "");
  const end = String(formData.get("endDate") ?? "");
  return {
    employeeId: String(formData.get("employeeId") ?? ""),
    startDate: start ? new Date(start) : new Date(),
    endDate: end ? new Date(end) : new Date(),
    leaveType: String(formData.get("leaveType") ?? "Основной отпуск"),
    status: String(formData.get("status") ?? "План"),
    substitute: String(formData.get("substitute") ?? ""),
    comment: String(formData.get("comment") ?? ""),
    control: String(formData.get("control") ?? ""),
  };
}

export async function createVacationLeaveAction(formData: FormData) {
  await requireEdit();
  const { createVacationLeave } = await import("@/modules/vacations/service");
  const data = parseLeaveForm(formData);
  const created = await createVacationLeave(data);
  await logMutation(
    "create",
    "Отпуска",
    created.id,
    `${data.leaveType} · ${data.status}`,
  );
  revalidatePath("/vacations");
  revalidatePath("/history");
}

export async function updateVacationLeaveAction(formData: FormData) {
  await requireEdit();
  const { updateVacationLeave } = await import("@/modules/vacations/service");
  const id = String(formData.get("id") ?? "");
  const data = parseLeaveForm(formData);
  await updateVacationLeave(id, data);
  await logMutation("update", "Отпуска", id, `${data.leaveType} · ${data.status}`);
  revalidatePath("/vacations");
  revalidatePath("/history");
}

export async function deleteVacationLeaveAction(formData: FormData) {
  await requireEdit();
  const { deleteVacationLeave } = await import("@/modules/vacations/service");
  const id = String(formData.get("id") ?? "");
  await deleteVacationLeave(id);
  await logMutation("delete", "Отпуска", id, id);
  revalidatePath("/vacations");
  revalidatePath("/history");
}

function parsePurchaseForm(formData: FormData) {
  const paymentDate = String(formData.get("paymentDate") ?? "");
  const quantity = Number(String(formData.get("quantity") ?? "1").replace(",", "."));
  return {
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    comment: String(formData.get("comment") ?? ""),
    paymentDate: paymentDate ? new Date(paymentDate) : null,
    unitPrice: parseMoney(formData.get("unitPrice") || "0"),
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
    productUrl: String(formData.get("productUrl") ?? ""),
    subscription: String(formData.get("subscription") ?? ""),
    priority: String(formData.get("priority") ?? "средний"),
    status: String(formData.get("status") ?? "план"),
  };
}

export async function createPurchaseItemAction(formData: FormData) {
  await requireEdit();
  const { createPurchaseItem } = await import("@/modules/purchases/service");
  const data = parsePurchaseForm(formData);
  const created = await createPurchaseItem(data);
  await logMutation("create", "Закупки", created.id, data.title || created.id);
  revalidatePath("/purchases");
  revalidatePath("/history");
}

export async function updatePurchaseItemAction(formData: FormData) {
  await requireEdit();
  const { updatePurchaseItem } = await import("@/modules/purchases/service");
  const id = String(formData.get("id") ?? "");
  const data = parsePurchaseForm(formData);
  await updatePurchaseItem(id, data);
  await logMutation("update", "Закупки", id, data.title || id);
  revalidatePath("/purchases");
  revalidatePath("/history");
}

export async function deletePurchaseItemAction(formData: FormData) {
  await requireEdit();
  const { deletePurchaseItem } = await import("@/modules/purchases/service");
  const id = String(formData.get("id") ?? "");
  await deletePurchaseItem(id);
  await logMutation("delete", "Закупки", id, id);
  revalidatePath("/purchases");
  revalidatePath("/history");
}

const SYNC_PATHS = [
  "/",
  "/income",
  "/expenses",
  "/works",
  "/purchases",
  "/counterparties",
  "/access",
] as const;

function revalidateAfterSync() {
  for (const path of SYNC_PATHS) {
    revalidatePath(path);
  }
}

async function requireOwnerUserId() {
  const access = await requireAccess("owner");
  if (access.kind !== "owner") {
    throw new Error("Только владелец может синхронизировать таблицы");
  }
  return access.userId;
}

function googleActionError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function saveGoogleOAuthClientAction(formData: FormData) {
  try {
    await requireAccess("owner");
    await saveGoogleOAuthClient(
      String(formData.get("clientId") ?? ""),
      String(formData.get("clientSecret") ?? ""),
    );
    revalidatePath("/access");
    return { ok: true as const, message: "Ключи Google сохранены. Теперь нажмите «Подключить»." };
  } catch (error) {
    return { ok: false as const, message: googleActionError(error, "Не удалось сохранить ключи Google") };
  }
}

export async function saveGoogleSpreadsheetAction(formData: FormData) {
  try {
    const userId = await requireOwnerUserId();
    const spreadsheet = String(formData.get("spreadsheet") ?? "");
    await saveGoogleSpreadsheet(userId, spreadsheet);
    revalidatePath("/access");
    return { ok: true as const, message: "Ссылка на таблицу сохранена" };
  } catch (error) {
    return { ok: false as const, message: googleActionError(error, "Не удалось сохранить ссылку") };
  }
}

export async function createGoogleSpreadsheetAction() {
  try {
    const userId = await requireOwnerUserId();
    const spreadsheetId = await createGoogleSpreadsheet(userId);
    revalidateAfterSync();
    return { ok: true as const, message: `Создана таблица: ${spreadsheetUrl(spreadsheetId)}` };
  } catch (error) {
    return { ok: false as const, message: googleActionError(error, "Не удалось создать таблицу") };
  }
}

export async function importGoogleSpreadsheetAction(formData: FormData) {
  try {
    const userId = await requireOwnerUserId();
    const spreadsheet = String(formData.get("spreadsheet") ?? "");
    const summary = await importGoogleSpreadsheet(userId, spreadsheet);
    revalidateAfterSync();
    return { ok: true as const, value: summary };
  } catch (error) {
    return { ok: false as const, message: googleActionError(error, "Не удалось перенести данные из таблицы") };
  }
}

export async function pullGoogleSheetsAction() {
  try {
    const userId = await requireOwnerUserId();
    const summary = await pullGoogleSheets(userId);
    revalidateAfterSync();
    return { ok: true as const, value: summary };
  } catch (error) {
    return { ok: false as const, message: googleActionError(error, "Не удалось загрузить из таблицы") };
  }
}

export async function pushGoogleSheetsAction() {
  try {
    const userId = await requireOwnerUserId();
    const summary = await pushGoogleSheets(userId);
    revalidateAfterSync();
    return { ok: true as const, value: summary };
  } catch (error) {
    return { ok: false as const, message: googleActionError(error, "Не удалось выгрузить в таблицу") };
  }
}

export async function syncGoogleSheetsAction() {
  try {
    const userId = await requireOwnerUserId();
    const result = await syncGoogleSheets(userId);
    revalidateAfterSync();
    return { ok: true as const, value: result };
  } catch (error) {
    return { ok: false as const, message: googleActionError(error, "Не удалось синхронизировать") };
  }
}
