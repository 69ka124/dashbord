import { getQuarter, getYear } from "date-fns";
import { Prisma } from "@prisma/client";
import {
  isCancelledExpenseWork,
  isPaidExpense,
  ruToWorkStatus,
  workStatusToRu,
} from "@/lib/finance-status";
import { nextExpenseCode } from "@/lib/codes";
import { yearBounds } from "@/lib/year-filter";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { ensureWorkTypeByName } from "@/modules/catalog/service";

export type ExpenseFilters = {
  q?: string;
  workStatus?: string;
  paymentStatus?: string;
  category?: string;
  counterpartyId?: string;
  orderModule?: string;
  year?: number;
  quarter?: number;
};

export type ExpenseRow = {
  id: string;
  expenseCode: string;
  recipient: string;
  task: string;
  project: string;
  category: string;
  registeredAt: Date;
  year: number;
  quarter: number;
  workStatus: string;
  paymentStatus: string;
  amount: number;
  totalToPay: number;
  plannedPayQuarter: number | null;
  paidAt: Date | null;
  actualPayQuarter: number | null;
  dueDate: Date | null;
  counterpartyId: string | null;
  orderModule: string | null;
  client: string | null;
  ke: string | null;
  estimate: number | null;
  orderIncome: number | null;
  materials: string | null;
  jiraUrl: string | null;
  materialUrl: string | null;
  documents: string | null;
  comment: string | null;
};

function enrich(record: {
  id: string;
  expenseCode: string;
  recipient: string;
  task: string;
  project: string;
  category: string;
  registeredAt: Date;
  workStatus: string;
  paymentStatus: string;
  amount: Prisma.Decimal | number;
  totalToPay: Prisma.Decimal | number;
  plannedPayQuarter: number | null;
  paidAt: Date | null;
  dueDate: Date | null;
  counterpartyId: string | null;
  orderModule?: string | null;
  client?: string | null;
  ke?: string | null;
  estimate?: Prisma.Decimal | number | null;
  orderIncome?: Prisma.Decimal | number | null;
  materials?: string | null;
  jiraUrl?: string | null;
  materialUrl: string | null;
  documents: string | null;
  comment: string | null;
}): ExpenseRow {
  return {
    id: record.id,
    expenseCode: record.expenseCode,
    recipient: record.recipient,
    task: record.task,
    project: record.project,
    category: record.category,
    registeredAt: record.registeredAt,
    year: getYear(record.registeredAt),
    quarter: getQuarter(record.registeredAt),
    workStatus: record.workStatus,
    paymentStatus: record.paymentStatus,
    amount: toNumber(record.amount),
    totalToPay: toNumber(record.totalToPay),
    plannedPayQuarter: record.plannedPayQuarter,
    paidAt: record.paidAt,
    actualPayQuarter: record.paidAt ? getQuarter(record.paidAt) : null,
    dueDate: record.dueDate,
    counterpartyId: record.counterpartyId,
    orderModule: record.orderModule ?? null,
    client: record.client ?? null,
    ke: record.ke ?? null,
    estimate: record.estimate == null ? null : toNumber(record.estimate),
    orderIncome: record.orderIncome == null ? null : toNumber(record.orderIncome),
    materials: record.materials ?? null,
    jiraUrl: record.jiraUrl ?? null,
    materialUrl: record.materialUrl,
    documents: record.documents,
    comment: record.comment,
  };
}

export async function listExpenseRecords(
  filters: ExpenseFilters = {},
): Promise<ExpenseRow[]> {
  const where: Prisma.ExpenseRecordWhereInput = {};

  if (filters.workStatus) where.workStatus = filters.workStatus;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters.category) where.category = filters.category;
  if (filters.counterpartyId) where.counterpartyId = filters.counterpartyId;
  if (filters.orderModule) where.orderModule = filters.orderModule;
  if (filters.year) {
    const { from, to } = yearBounds(filters.year);
    where.registeredAt = { gte: from, lte: to };
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { expenseCode: { contains: q } },
      { recipient: { contains: q } },
      { task: { contains: q } },
      { project: { contains: q } },
      { client: { contains: q } },
      { comment: { contains: q } },
      { documents: { contains: q } },
      { jiraUrl: { contains: q } },
    ];
  }

  const records = await prisma.expenseRecord.findMany({
    where,
    orderBy: [{ registeredAt: "desc" }, { createdAt: "desc" }],
  });

  let rows = records.map(enrich);

  if (filters.quarter) {
    rows = rows.filter((r) => r.quarter === filters.quarter);
  }

  return rows;
}

export type ExpenseInput = {
  expenseCode?: string;
  recipient: string;
  task: string;
  project: string;
  category: string;
  registeredAt: Date;
  workStatus: string;
  paymentStatus: string;
  amount: number;
  totalToPay: number;
  plannedPayQuarter?: number | null;
  paidAt?: Date | null;
  dueDate?: Date | null;
  counterpartyId?: string | null;
  orderModule?: string | null;
  client?: string | null;
  ke?: string | null;
  estimate?: number | null;
  orderIncome?: number | null;
  materials?: string | null;
  jiraUrl?: string;
  materialUrl?: string;
  documents?: string;
  comment?: string;
};

function toData(input: ExpenseInput & { expenseCode: string }) {
  return {
    expenseCode: input.expenseCode.trim(),
    recipient: input.recipient.trim(),
    task: input.task.trim(),
    project: input.project.trim(),
    category: input.category.trim(),
    registeredAt: input.registeredAt,
    workStatus: input.workStatus.trim() || "в работе",
    paymentStatus: input.paymentStatus.trim() || "не оплачено",
    amount: input.amount,
    totalToPay: input.totalToPay,
    plannedPayQuarter: input.plannedPayQuarter ?? null,
    paidAt: input.paidAt ?? null,
    dueDate: input.dueDate ?? null,
    counterpartyId: input.counterpartyId ?? null,
    orderModule: input.orderModule?.trim() || null,
    client: input.client?.trim() || null,
    ke: input.ke?.trim() || null,
    estimate: input.estimate ?? null,
    orderIncome: input.orderIncome ?? null,
    materials: input.materials?.trim() || null,
    jiraUrl: input.jiraUrl?.trim() || null,
    materialUrl: input.materialUrl?.trim() || null,
    documents: input.documents?.trim() || null,
    comment: input.comment?.trim() || null,
  };
}

async function resolveCounterpartyId(
  counterpartyId?: string | null,
  recipient?: string,
): Promise<string | null> {
  if (counterpartyId?.trim()) return counterpartyId.trim();
  if (!recipient?.trim()) return null;
  const match = await prisma.counterparty.findFirst({
    where: { name: recipient.trim() },
    select: { id: true },
  });
  return match?.id ?? null;
}

async function prepareExpenseInput(
  input: ExpenseInput,
  options?: { preserveCode?: string },
): Promise<ExpenseInput & { expenseCode: string }> {
  const expenseCode =
    options?.preserveCode ||
    input.expenseCode?.trim() ||
    (await nextExpenseCode());

  if (input.category?.trim()) {
    await ensureWorkTypeByName(input.category);
  }

  const counterpartyId = await resolveCounterpartyId(input.counterpartyId, input.recipient);
  return { ...input, expenseCode, counterpartyId };
}

export async function getExpenseByCode(code: string): Promise<ExpenseRow | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const record = await prisma.expenseRecord.findFirst({
    where: {
      OR: [{ expenseCode: trimmed }, { id: trimmed }],
    },
  });

  return record ? enrich(record) : null;
}

export async function createExpenseRecord(input: ExpenseInput) {
  const prepared = await prepareExpenseInput(input);
  return prisma.expenseRecord.create({
    data: toData(prepared),
  });
}

export async function updateExpenseRecord(id: string, input: ExpenseInput) {
  const existing = await prisma.expenseRecord.findUniqueOrThrow({ where: { id } });
  const prepared = await prepareExpenseInput(input, { preserveCode: existing.expenseCode });
  return prisma.expenseRecord.update({
    where: { id },
    data: toData(prepared),
  });
}

export async function deleteExpenseRecord(id: string) {
  return prisma.expenseRecord.delete({ where: { id } });
}

export async function markExpensePaid(
  id: string,
  input: { paidAt: Date; paymentStatus?: string },
) {
  return prisma.expenseRecord.update({
    where: { id },
    data: {
      paidAt: input.paidAt,
      paymentStatus: input.paymentStatus ?? "оплачено",
    },
  });
}

export function expenseRowToWorkStatus(row: ExpenseRow) {
  return ruToWorkStatus(row.workStatus);
}

export function mapWorkStatusFilter(status?: string) {
  if (!status || status === "all") return undefined;
  return workStatusToRu(status as import("@/modules/ledger/service").WorkStatus);
}

export async function sumCounterpartyUsage(
  counterpartyId: string,
  counterpartyName: string,
  year?: number,
) {
  const expenses = await prisma.expenseRecord.findMany({
    where: {
      OR: [{ counterpartyId }, { counterpartyId: null, recipient: counterpartyName }],
    },
  });

  let obligations = 0;
  let paid = 0;

  if (year) {
    const { from, to } = yearBounds(year);
    for (const row of expenses) {
      if (isCancelledExpenseWork(row.workStatus)) continue;
      const total = toNumber(row.totalToPay);
      if (isPaidExpense(row.paymentStatus)) {
        if (row.paidAt && row.paidAt >= from && row.paidAt <= to) {
          paid += total;
        }
      } else if (row.registeredAt >= from && row.registeredAt <= to) {
        obligations += total;
      }
    }
  } else {
    for (const row of expenses) {
      if (isCancelledExpenseWork(row.workStatus)) continue;
      const total = toNumber(row.totalToPay);
      if (isPaidExpense(row.paymentStatus)) {
        paid += total;
      } else {
        obligations += total;
      }
    }
  }

  return { obligations, paid, used: obligations + paid };
}
