import { addDays, endOfDay, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";
import { isPaidExpense, workStatusToRu } from "@/lib/finance-status";
import { nextWorkOrderCode } from "@/lib/codes";
import { yearBounds } from "@/lib/year-filter";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { ensureWorkTypeByName } from "@/modules/catalog/service";
import { createDesignOrder, deleteDesignOrder, listDesignOrders, updateDesignOrder } from "@/modules/design/service";
import {
  createExpenseRecord,
  deleteExpenseRecord,
  listExpenseRecords,
  mapWorkStatusFilter,
  updateExpenseRecord,
} from "@/modules/expense/service";
import { createIncomeRecord } from "@/modules/income/service";
import {
  createProductionOrder,
  deleteProductionOrder,
  listProductionOrders,
  updateProductionOrder,
} from "@/modules/production/service";

export type WorkStatus = "planned" | "in_progress" | "done" | "cancelled";
export type PaymentType = "income" | "expense";
export type WorkModule = "work" | "production" | "design" | "postproduction";

export type WorkView = {
  id: string;
  source: WorkModule;
  expenseCode: string | null;
  title: string;
  amount: Prisma.Decimal;
  status: WorkStatus;
  dueDate: Date | null;
  comment: string | null;
  workTypeId: string;
  counterpartyId: string | null;
  workType: { id: string; name: string; active: boolean };
  counterparty: { id: string; name: string } | null;
  payments: { id: string; amount: Prisma.Decimal; type: string }[];
  project: string;
  client: string | null;
  jiraUrl: string | null;
  ke: string | null;
  estimate: number | null;
  orderIncome: number | null;
  materials: string | null;
  receivedAt: Date | null;
};

export type PaymentView = {
  id: string;
  type: PaymentType;
  amount: Prisma.Decimal;
  date: Date;
  comment: string | null;
  workId: string | null;
  counterpartyId: string | null;
  work: { id: string; title: string } | null;
  counterparty: { id: string; name: string } | null;
};

export type WorkFilters = {
  status?: WorkStatus | "all";
  workTypeId?: string;
  counterpartyId?: string;
  module?: WorkModule | "all";
  q?: string;
  year?: number;
};

function ruStatusToWorkStatus(status: string): WorkStatus {
  const normalized = status.trim().toLowerCase();
  if (normalized === "готово" || normalized === "done") return "done";
  if (normalized === "отменено" || normalized === "cancelled") return "cancelled";
  if (normalized === "план" || normalized === "planned") return "planned";
  return "in_progress";
}

function expenseToWork(row: Awaited<ReturnType<typeof listExpenseRecords>>[number]): WorkView {
  const paid = isPaidExpense(row.paymentStatus)
    ? [{ id: `${row.id}-paid`, amount: new Prisma.Decimal(row.totalToPay), type: "expense" }]
    : [];

  return {
    id: row.id,
    source: row.orderModule === "postproduction" ? "postproduction" : "work",
    expenseCode: row.expenseCode,
    title: row.task,
    amount: new Prisma.Decimal(row.totalToPay),
    status: ruStatusToWorkStatus(row.workStatus),
    dueDate: row.dueDate,
    comment: row.comment,
    workTypeId: row.category,
    counterpartyId: row.counterpartyId,
    workType: { id: row.category, name: row.category, active: true },
    counterparty: row.counterpartyId
      ? { id: row.counterpartyId, name: row.recipient }
      : null,
    payments: paid,
    project: row.project,
    client: row.client,
    jiraUrl: row.jiraUrl,
    ke: row.ke,
    estimate: row.estimate,
    orderIncome: row.orderIncome,
    materials: row.materials,
    receivedAt: row.registeredAt,
  };
}

function productionToWork(row: Awaited<ReturnType<typeof listProductionOrders>>[number]): WorkView {
  return {
    id: row.id,
    source: "production",
    expenseCode: row.orderCode,
    title: row.project,
    amount: new Prisma.Decimal(row.estimate ?? row.income ?? 0),
    status: ruStatusToWorkStatus(row.status),
    dueDate: row.deadline,
    comment: row.comment,
    workTypeId: row.workType,
    counterpartyId: null,
    workType: { id: row.workType, name: row.workType, active: true },
    counterparty: row.client ? { id: row.client, name: row.client } : null,
    payments: [],
    project: row.project,
    client: row.client,
    jiraUrl: row.jiraUrl,
    ke: row.ke,
    estimate: row.estimate,
    orderIncome: row.income,
    materials: row.materials,
    receivedAt: row.receivedAt,
  };
}

function designToWork(row: Awaited<ReturnType<typeof listDesignOrders>>[number]): WorkView {
  return {
    id: row.id,
    source: "design",
    expenseCode: row.orderCode,
    title: row.project,
    amount: new Prisma.Decimal(row.income ?? 0),
    status: ruStatusToWorkStatus(row.status),
    dueDate: row.deadline,
    comment: row.comment,
    workTypeId: "Дизайн",
    counterpartyId: null,
    workType: { id: "design", name: "Дизайн", active: true },
    counterparty: row.client ? { id: row.client, name: row.client } : null,
    payments: [],
    project: row.project,
    client: row.client,
    jiraUrl: row.jiraUrl,
    ke: row.ke,
    estimate: null,
    orderIncome: row.income,
    materials: row.materials,
    receivedAt: row.receivedAt,
  };
}

export async function listWorks(filters: WorkFilters = {}): Promise<WorkView[]> {
  const moduleFilter = filters.module ?? "all";
  const items: WorkView[] = [];

  if (moduleFilter === "all" || moduleFilter === "work" || moduleFilter === "production" || moduleFilter === "design" || moduleFilter === "postproduction") {
    let category: string | undefined;
    if (filters.workTypeId) {
      const workType = await prisma.workType.findUnique({
        where: { id: filters.workTypeId },
        select: { name: true },
      });
      category = workType?.name;
    }

  if (moduleFilter === "all" || moduleFilter === "work" || moduleFilter === "postproduction") {
      const rows = await listExpenseRecords({
        q: filters.q,
        counterpartyId: filters.counterpartyId,
        year: filters.year,
        workStatus: mapWorkStatusFilter(filters.status),
        category,
        orderModule: moduleFilter === "postproduction" ? "postproduction" : undefined,
      });

      items.push(
        ...rows
          .filter((row) => !isPaidExpense(row.paymentStatus))
          .filter((row) => {
            if (moduleFilter === "postproduction") return row.orderModule === "postproduction";
            if (moduleFilter === "work") return !row.orderModule || row.orderModule === "work";
            // all: include work + postproduction expense-backed rows (not paid)
            return !row.orderModule || row.orderModule === "work" || row.orderModule === "postproduction";
          })
          .map(expenseToWork),
      );
    }

    if (moduleFilter === "all" || moduleFilter === "production") {
      const productionRows = await listProductionOrders({
        q: filters.q,
        year: filters.year,
        workType: category,
      });
      items.push(...productionRows.map(productionToWork));
    }

    if (moduleFilter === "all" || moduleFilter === "design") {
      const designRows = await listDesignOrders({
        q: filters.q,
        year: filters.year,
      });
      items.push(...designRows.map(designToWork));
    }
  }

  let result = items;

  if (filters.status && filters.status !== "all") {
    result = result.filter((row) => row.status === filters.status);
  }

  if (filters.counterpartyId) {
    result = result.filter((row) => row.counterpartyId === filters.counterpartyId);
  }

  return result.sort((a, b) => {
    const aTime = a.receivedAt?.getTime() ?? a.dueDate?.getTime() ?? 0;
    const bTime = b.receivedAt?.getTime() ?? b.dueDate?.getTime() ?? 0;
    return bTime - aTime;
  });
}

export async function createWork(input: {
  module?: WorkModule;
  title: string;
  amount: number;
  status: WorkStatus;
  dueDate?: Date | null;
  comment?: string;
  workTypeId?: string;
  workTypeName?: string;
  counterpartyId?: string | null;
  counterpartyName?: string;
  project?: string;
  client?: string;
  jiraUrl?: string;
  ke?: string;
  estimate?: number | null;
  orderIncome?: number | null;
  materials?: string;
  receivedAt?: Date;
}) {
  const module = input.module ?? "work";

  if (module === "production") {
    const workType = input.workTypeName?.trim() || input.workTypeId?.trim() || "Съёмка";
    await ensureWorkTypeByName(workType);
    const created = await createProductionOrder({
      jiraUrl: input.jiraUrl,
      receivedAt: input.receivedAt ?? new Date(),
      project: input.project?.trim() || input.title.trim(),
      client: input.client?.trim() || input.counterpartyName?.trim() || "—",
      workType,
      ke: input.ke,
      status: workStatusToRu(input.status),
      income: input.orderIncome ?? input.amount,
      deadline: input.dueDate ?? null,
      estimate: input.estimate ?? input.amount,
      materials: input.materials,
      comment: input.comment,
    });
    return productionToWork(
      (await listProductionOrders({})).find((row) => row.id === created.id)!,
    );
  }

  if (module === "design") {
    const created = await createDesignOrder({
      jiraUrl: input.jiraUrl,
      receivedAt: input.receivedAt ?? new Date(),
      project: input.project?.trim() || input.title.trim(),
      client: input.client?.trim() || input.counterpartyName?.trim() || "—",
      ke: input.ke,
      status: workStatusToRu(input.status),
      income: input.orderIncome ?? input.amount,
      deadline: input.dueDate ?? null,
      materials: input.materials,
      comment: input.comment,
    });
    return designToWork((await listDesignOrders({})).find((row) => row.id === created.id)!);
  }

  const counterparty = input.counterpartyId
    ? await prisma.counterparty.findUnique({ where: { id: input.counterpartyId } })
    : null;

  const category =
    input.workTypeName?.trim() ||
    input.workTypeId?.trim() ||
    (module === "postproduction" ? "постпродакшн" : "подряд");
  await ensureWorkTypeByName(category);

  const created = await createExpenseRecord({
    expenseCode: await nextWorkOrderCode(),
    recipient: counterparty?.name ?? input.counterpartyName?.trim() ?? "—",
    task: input.title.trim(),
    project: input.project?.trim() || "—",
    category,
    registeredAt: input.receivedAt ?? new Date(),
    workStatus: workStatusToRu(input.status),
    paymentStatus: "не оплачено",
    amount: input.amount,
    totalToPay: input.amount,
    dueDate: input.dueDate ?? null,
    counterpartyId: input.counterpartyId ?? null,
    orderModule: module === "postproduction" ? "postproduction" : "work",
    client: input.client?.trim() || null,
    ke: input.ke?.trim() || null,
    estimate: input.estimate ?? null,
    orderIncome: input.orderIncome ?? null,
    materials: input.materials?.trim() || null,
    jiraUrl: input.jiraUrl?.trim() || undefined,
    comment: input.comment?.trim() || undefined,
  });

  const row = (await listExpenseRecords({})).find((item) => item.id === created.id);
  if (!row) throw new Error("Не удалось создать работу");
  return expenseToWork(row);
}

export async function updateWork(
  id: string,
  input: {
    source: WorkModule;
    title: string;
    amount: number;
    status: WorkStatus;
    dueDate?: Date | null;
    comment?: string;
    workTypeId?: string;
    workTypeName?: string;
    counterpartyId?: string | null;
    project?: string;
    client?: string;
    jiraUrl?: string;
    ke?: string;
    estimate?: number | null;
    orderIncome?: number | null;
    materials?: string;
    receivedAt?: Date;
  },
) {
  if (input.source === "production") {
    const existing = await prisma.productionOrder.findUniqueOrThrow({ where: { id } });
    const workType = input.workTypeName?.trim() || input.workTypeId?.trim() || existing.workType;
    await ensureWorkTypeByName(workType);
    await updateProductionOrder(id, {
      jiraUrl: input.jiraUrl ?? existing.jiraUrl ?? undefined,
      receivedAt: input.receivedAt ?? existing.receivedAt,
      project: input.project?.trim() || input.title.trim(),
      client: input.client?.trim() || existing.client,
      workType,
      ke: input.ke ?? existing.ke ?? undefined,
      status: workStatusToRu(input.status),
      income: input.orderIncome ?? input.amount,
      deadline: input.dueDate ?? null,
      estimate: input.estimate ?? input.amount,
      materials: input.materials ?? existing.materials ?? undefined,
      comment: input.comment ?? existing.comment ?? undefined,
    });
    const row = (await listProductionOrders({})).find((item) => item.id === id);
    if (!row) throw new Error("Работа не найдена");
    return productionToWork(row);
  }

  if (input.source === "design") {
    const existing = await prisma.designOrder.findUniqueOrThrow({ where: { id } });
    await updateDesignOrder(id, {
      jiraUrl: input.jiraUrl ?? existing.jiraUrl ?? undefined,
      receivedAt: input.receivedAt ?? existing.receivedAt,
      project: input.project?.trim() || input.title.trim(),
      client: input.client?.trim() || existing.client,
      ke: input.ke ?? existing.ke ?? undefined,
      status: workStatusToRu(input.status),
      income: input.orderIncome ?? input.amount,
      deadline: input.dueDate ?? null,
      materials: input.materials ?? existing.materials ?? undefined,
      comment: input.comment ?? existing.comment ?? undefined,
    });
    const row = (await listDesignOrders({})).find((item) => item.id === id);
    if (!row) throw new Error("Работа не найдена");
    return designToWork(row);
  }

  const existing = await prisma.expenseRecord.findUniqueOrThrow({ where: { id } });
  const counterparty = input.counterpartyId
    ? await prisma.counterparty.findUnique({ where: { id: input.counterpartyId } })
    : null;
  const category = input.workTypeName?.trim() || input.workTypeId?.trim() || existing.category;
  await ensureWorkTypeByName(category);

  await updateExpenseRecord(id, {
    recipient: counterparty?.name ?? existing.recipient,
    task: input.title.trim(),
    project: input.project?.trim() || existing.project,
    category,
    registeredAt: input.receivedAt ?? existing.registeredAt,
    workStatus: workStatusToRu(input.status),
    paymentStatus: existing.paymentStatus,
    amount: input.amount,
    totalToPay: input.amount,
    plannedPayQuarter: existing.plannedPayQuarter,
    paidAt: existing.paidAt,
    dueDate: input.dueDate ?? null,
    counterpartyId: input.counterpartyId ?? null,
    orderModule: existing.orderModule ?? "work",
    client: input.client?.trim() || existing.client || undefined,
    ke: input.ke ?? existing.ke ?? undefined,
    estimate: input.estimate ?? (existing.estimate == null ? null : toNumber(existing.estimate)),
    orderIncome:
      input.orderIncome ?? (existing.orderIncome == null ? null : toNumber(existing.orderIncome)),
    materials: input.materials ?? existing.materials ?? undefined,
    jiraUrl: input.jiraUrl ?? existing.jiraUrl ?? undefined,
    materialUrl: existing.materialUrl ?? undefined,
    documents: existing.documents ?? undefined,
    comment: input.comment?.trim() || undefined,
  });

  const rows = await listExpenseRecords({});
  const row = rows.find((item) => item.id === id);
  if (!row) throw new Error("Работа не найдена");
  return expenseToWork(row);
}

export async function deleteWork(id: string, source: WorkModule = "work") {
  if (source === "production") return deleteProductionOrder(id);
  if (source === "design") return deleteDesignOrder(id);
  return deleteExpenseRecord(id);
}

export type PaymentFilters = {
  type?: PaymentType | "all";
  workId?: string;
  counterpartyId?: string;
  year?: number;
  from?: Date;
  to?: Date;
};

export async function listPayments(filters: PaymentFilters = {}): Promise<PaymentView[]> {
  const yearRange =
    filters.year != null
      ? yearBounds(filters.year)
      : filters.from || filters.to
        ? { from: filters.from ?? new Date(1970, 0, 1), to: filters.to ?? new Date(9999, 11, 31) }
        : null;

  const [expenses, incomes] = await Promise.all([
    listExpenseRecords({
      counterpartyId: filters.counterpartyId,
      year: filters.year,
    }),
    prisma.incomeRecord.findMany({
      orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const expensePayments: PaymentView[] = expenses
    .filter((row) => isPaidExpense(row.paymentStatus) && row.paidAt)
    .filter((row) => {
      if (filters.workId && row.id !== filters.workId) return false;
      if (filters.type === "income") return false;
      if (!yearRange || !row.paidAt) return true;
      return row.paidAt >= yearRange.from && row.paidAt <= yearRange.to;
    })
    .map((row) => ({
      id: row.id,
      type: "expense" as const,
      amount: new Prisma.Decimal(row.totalToPay),
      date: row.paidAt!,
      comment: row.comment,
      workId: row.id,
      counterpartyId: row.counterpartyId,
      work: { id: row.id, title: row.task },
      counterparty: row.counterpartyId
        ? { id: row.counterpartyId, name: row.recipient }
        : null,
    }));

  const incomePayments: PaymentView[] = incomes
    .filter((row) => row.status.trim().toLowerCase() === "получено")
    .filter((row) => {
      if (filters.type === "expense") return false;
      if (!yearRange) return true;
      return row.receivedAt >= yearRange.from && row.receivedAt <= yearRange.to;
    })
    .map((row) => ({
      id: row.id,
      type: "income" as const,
      amount: row.amount,
      date: row.receivedAt,
      comment: row.documents,
      workId: null,
      counterpartyId: null,
      work: null,
      counterparty: null,
    }));

  const combined = [...expensePayments, ...incomePayments].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  );

  if (filters.type === "income") return incomePayments;
  if (filters.type === "expense") return expensePayments;
  return combined;
}

export async function createPayment(input: {
  type: PaymentType;
  amount: number;
  date: Date;
  comment?: string;
  workId?: string | null;
  counterpartyId?: string | null;
}) {
  if (input.type === "income") {
    const created = await createIncomeRecord({
      receivedAt: input.date,
      incomeKind: "прочее",
      payer: "Оплата",
      project: "—",
      amount: input.amount,
      status: "получено",
      documents: input.comment?.trim() || undefined,
      source: "Оплаты",
    });
    return {
      id: created.id,
      type: "income" as const,
      amount: created.amount,
      date: created.receivedAt,
      comment: created.documents,
      workId: null,
      counterpartyId: null,
      work: null,
      counterparty: null,
    } satisfies PaymentView;
  }

  if (input.workId) {
    const existing = await prisma.expenseRecord.findUniqueOrThrow({
      where: { id: input.workId },
    });
    const updated = await updateExpenseRecord(input.workId, {
      expenseCode: existing.expenseCode,
      recipient: existing.recipient,
      task: existing.task,
      project: existing.project,
      category: existing.category,
      registeredAt: existing.registeredAt,
      workStatus: existing.workStatus,
      paymentStatus:
        input.amount >= toNumber(existing.totalToPay) ? "оплачено" : "частично",
      amount: toNumber(existing.amount),
      totalToPay: toNumber(existing.totalToPay),
      plannedPayQuarter: existing.plannedPayQuarter,
      paidAt: input.date,
      dueDate: existing.dueDate,
      counterpartyId: existing.counterpartyId,
      jiraUrl: existing.jiraUrl ?? undefined,
      materialUrl: existing.materialUrl ?? undefined,
      documents: existing.documents ?? undefined,
      comment: input.comment?.trim() || existing.comment || undefined,
    });
    return {
      id: updated.id,
      type: "expense" as const,
      amount: updated.totalToPay,
      date: input.date,
      comment: updated.comment,
      workId: updated.id,
      counterpartyId: updated.counterpartyId,
      work: { id: updated.id, title: updated.task },
      counterparty: updated.counterpartyId
        ? { id: updated.counterpartyId, name: updated.recipient }
        : null,
    } satisfies PaymentView;
  }

  const counterparty = input.counterpartyId
    ? await prisma.counterparty.findUnique({ where: { id: input.counterpartyId } })
    : null;

  const created = await createExpenseRecord({
    recipient: counterparty?.name ?? "—",
    task: input.comment?.trim() || "Оплата",
    project: "—",
    category: "подряд",
    registeredAt: input.date,
    workStatus: "готово",
    paymentStatus: "оплачено",
    amount: input.amount,
    totalToPay: input.amount,
    paidAt: input.date,
    counterpartyId: input.counterpartyId ?? null,
    comment: input.comment?.trim() || undefined,
  });

  return {
    id: created.id,
    type: "expense" as const,
    amount: created.totalToPay,
    date: input.date,
    comment: created.comment,
    workId: created.id,
    counterpartyId: created.counterpartyId,
    work: { id: created.id, title: created.task },
    counterparty: created.counterpartyId
      ? { id: created.counterpartyId, name: created.recipient }
      : null,
  } satisfies PaymentView;
}

export async function updatePayment(
  id: string,
  input: {
    type: PaymentType;
    amount: number;
    date: Date;
    comment?: string;
    workId?: string | null;
    counterpartyId?: string | null;
  },
) {
  if (input.type === "income") {
    const existing = await prisma.incomeRecord.findUniqueOrThrow({ where: { id } });
    const updated = await prisma.incomeRecord.update({
      where: { id },
      data: {
        amount: input.amount,
        receivedAt: input.date,
        documents: input.comment?.trim() || existing.documents,
        status: "получено",
      },
    });
    return {
      id: updated.id,
      type: "income" as const,
      amount: updated.amount,
      date: updated.receivedAt,
      comment: updated.documents,
      workId: null,
      counterpartyId: null,
      work: null,
      counterparty: null,
    } satisfies PaymentView;
  }

  const existing = await prisma.expenseRecord.findUniqueOrThrow({ where: { id } });
  const counterparty = input.counterpartyId
    ? await prisma.counterparty.findUnique({ where: { id: input.counterpartyId } })
    : null;

  const updated = await updateExpenseRecord(id, {
    expenseCode: existing.expenseCode,
    recipient: counterparty?.name ?? existing.recipient,
    task: existing.task,
    project: existing.project,
    category: existing.category,
    registeredAt: existing.registeredAt,
    workStatus: existing.workStatus,
    paymentStatus: "оплачено",
    amount: input.amount,
    totalToPay: input.amount,
    plannedPayQuarter: existing.plannedPayQuarter,
    paidAt: input.date,
    dueDate: existing.dueDate,
    counterpartyId: input.counterpartyId ?? existing.counterpartyId,
    jiraUrl: existing.jiraUrl ?? undefined,
    materialUrl: existing.materialUrl ?? undefined,
    documents: existing.documents ?? undefined,
    comment: input.comment?.trim() || existing.comment || undefined,
  });

  return {
    id: updated.id,
    type: "expense" as const,
    amount: updated.totalToPay,
    date: input.date,
    comment: updated.comment,
    workId: updated.id,
    counterpartyId: updated.counterpartyId,
    work: { id: updated.id, title: updated.task },
    counterparty: updated.counterpartyId
      ? { id: updated.counterpartyId, name: updated.recipient }
      : null,
  } satisfies PaymentView;
}

export async function deletePayment(id: string) {
  const income = await prisma.incomeRecord.findUnique({ where: { id } });
  if (income) {
    return prisma.incomeRecord.delete({ where: { id } });
  }
  const expense = await prisma.expenseRecord.findUniqueOrThrow({ where: { id } });
  return updateExpenseRecord(id, {
    expenseCode: expense.expenseCode,
    recipient: expense.recipient,
    task: expense.task,
    project: expense.project,
    category: expense.category,
    registeredAt: expense.registeredAt,
    workStatus: expense.workStatus,
    paymentStatus: "не оплачено",
    amount: toNumber(expense.amount),
    totalToPay: toNumber(expense.totalToPay),
    plannedPayQuarter: expense.plannedPayQuarter,
    paidAt: null,
    dueDate: expense.dueDate,
    counterpartyId: expense.counterpartyId,
    jiraUrl: expense.jiraUrl ?? undefined,
    materialUrl: expense.materialUrl ?? undefined,
    documents: expense.documents ?? undefined,
    comment: expense.comment ?? undefined,
  });
}

export function workAnchorId(work: Pick<WorkView, "id" | "source">) {
  if (work.source === "production") return `production-${work.id}`;
  if (work.source === "design") return `design-${work.id}`;
  return `work-${work.id}`;
}

export function isProductionDeadlineSoon(deadline: Date | null, status: string) {
  if (!deadline) return { overdue: false, within7Days: false };
  const today = startOfDay(new Date());
  const inSeven = endOfDay(addDays(today, 7));
  const closed = ["готово", "отменено", "done", "cancelled"].includes(status.trim().toLowerCase());
  if (closed) return { overdue: false, within7Days: false };
  if (deadline < today) return { overdue: true, within7Days: false };
  if (deadline <= inSeven) return { overdue: false, within7Days: true };
  return { overdue: false, within7Days: false };
}
