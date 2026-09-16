import { addDays, endOfDay, getQuarter, getYear, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { nextDesignOrderCode } from "@/lib/codes";

export type DesignFilters = {
  q?: string;
  status?: string;
  year?: number;
  quarter?: number;
};

export type DesignRow = {
  id: string;
  orderCode: string;
  jiraUrl: string | null;
  receivedAt: Date;
  year: number;
  quarter: number;
  project: string;
  client: string;
  ke: string | null;
  status: string;
  income: number;
  deadline: Date | null;
  within7Days: boolean;
  overdue: boolean;
  materials: string | null;
  comment: string | null;
};

function enrich(order: {
  id: string;
  orderCode: string;
  jiraUrl: string | null;
  receivedAt: Date;
  project: string;
  client: string;
  ke: string | null;
  status: string;
  income: Prisma.Decimal | number;
  deadline: Date | null;
  materials: string | null;
  comment: string | null;
}): DesignRow {
  const today = startOfDay(new Date());
  const inSeven = endOfDay(addDays(today, 7));
  const deadline = order.deadline;
  const closed = ["готово", "отменено", "done", "cancelled"].includes(
    order.status.trim().toLowerCase(),
  );

  let within7Days = false;
  let overdue = false;
  if (deadline && !closed) {
    if (deadline < today) overdue = true;
    else if (deadline <= inSeven) within7Days = true;
  }

  return {
    id: order.id,
    orderCode: order.orderCode,
    jiraUrl: order.jiraUrl,
    receivedAt: order.receivedAt,
    year: getYear(order.receivedAt),
    quarter: getQuarter(order.receivedAt),
    project: order.project,
    client: order.client,
    ke: order.ke,
    status: order.status,
    income: toNumber(order.income),
    deadline,
    within7Days,
    overdue,
    materials: order.materials,
    comment: order.comment,
  };
}

export async function listDesignOrders(filters: DesignFilters = {}): Promise<DesignRow[]> {
  const where: Prisma.DesignOrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { orderCode: { contains: q } },
      { project: { contains: q } },
      { client: { contains: q } },
      { comment: { contains: q } },
      { ke: { contains: q } },
    ];
  }

  const orders = await prisma.designOrder.findMany({
    where,
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
  });

  let rows = orders.map(enrich);

  if (filters.year) {
    rows = rows.filter((r) => r.year === filters.year);
  }
  if (filters.quarter) {
    rows = rows.filter((r) => r.quarter === filters.quarter);
  }

  return rows;
}

export type DesignInput = {
  orderCode?: string;
  jiraUrl?: string;
  receivedAt: Date;
  project: string;
  client: string;
  ke?: string;
  status: string;
  income: number;
  deadline?: Date | null;
  materials?: string;
  comment?: string;
};

function toData(input: DesignInput & { orderCode: string }) {
  return {
    orderCode: input.orderCode.trim(),
    jiraUrl: input.jiraUrl?.trim() || null,
    receivedAt: input.receivedAt,
    project: input.project.trim(),
    client: input.client.trim(),
    ke: input.ke?.trim() || null,
    status: input.status.trim() || "в работе",
    income: input.income,
    deadline: input.deadline ?? null,
    materials: input.materials?.trim() || null,
    comment: input.comment?.trim() || null,
  };
}

export async function createDesignOrder(input: DesignInput) {
  const orderCode = input.orderCode?.trim() || (await nextDesignOrderCode());
  return prisma.designOrder.create({ data: toData({ ...input, orderCode }) });
}

export async function updateDesignOrder(id: string, input: DesignInput) {
  const existing = await prisma.designOrder.findUniqueOrThrow({ where: { id } });
  const orderCode = input.orderCode?.trim() || existing.orderCode;
  return prisma.designOrder.update({ where: { id }, data: toData({ ...input, orderCode }) });
}

export async function deleteDesignOrder(id: string) {
  return prisma.designOrder.delete({ where: { id } });
}
