import { addDays, endOfDay, getQuarter, getYear, startOfDay } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";
import { nextProductionOrderCode } from "@/lib/codes";

export type ProductionFilters = {
  q?: string;
  status?: string;
  workType?: string;
  year?: number;
  quarter?: number;
};

export type ProductionRow = {
  id: string;
  orderCode: string;
  jiraUrl: string | null;
  receivedAt: Date;
  year: number;
  quarter: number;
  project: string;
  client: string;
  workType: string;
  ke: string | null;
  status: string;
  income: number;
  deadline: Date | null;
  within7Days: boolean;
  overdue: boolean;
  estimate: number | null;
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
  workType: string;
  ke: string | null;
  status: string;
  income: Prisma.Decimal | number;
  deadline: Date | null;
  estimate: Prisma.Decimal | number | null;
  materials: string | null;
  comment: string | null;
}): ProductionRow {
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
    workType: order.workType,
    ke: order.ke,
    status: order.status,
    income: toNumber(order.income),
    deadline,
    within7Days,
    overdue,
    estimate: order.estimate == null ? null : toNumber(order.estimate),
    materials: order.materials,
    comment: order.comment,
  };
}

export async function listProductionOrders(
  filters: ProductionFilters = {},
): Promise<ProductionRow[]> {
  const where: Prisma.ProductionOrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.workType) where.workType = filters.workType;
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

  const orders = await prisma.productionOrder.findMany({
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

export type ProductionInput = {
  orderCode?: string;
  jiraUrl?: string;
  receivedAt: Date;
  project: string;
  client: string;
  workType: string;
  ke?: string;
  status: string;
  income: number;
  deadline?: Date | null;
  estimate?: number | null;
  materials?: string;
  comment?: string;
};

function toData(input: ProductionInput & { orderCode: string }) {
  return {
    orderCode: input.orderCode.trim(),
    jiraUrl: input.jiraUrl?.trim() || null,
    receivedAt: input.receivedAt,
    project: input.project.trim(),
    client: input.client.trim(),
    workType: input.workType.trim(),
    ke: input.ke?.trim() || null,
    status: input.status.trim() || "в работе",
    income: input.income,
    deadline: input.deadline ?? null,
    estimate: input.estimate ?? null,
    materials: input.materials?.trim() || null,
    comment: input.comment?.trim() || null,
  };
}

export async function createProductionOrder(input: ProductionInput) {
  const orderCode = input.orderCode?.trim() || (await nextProductionOrderCode());
  return prisma.productionOrder.create({ data: toData({ ...input, orderCode }) });
}

export async function updateProductionOrder(id: string, input: ProductionInput) {
  const existing = await prisma.productionOrder.findUniqueOrThrow({ where: { id } });
  const orderCode = input.orderCode?.trim() || existing.orderCode;
  return prisma.productionOrder.update({ where: { id }, data: toData({ ...input, orderCode }) });
}

export async function deleteProductionOrder(id: string) {
  return prisma.productionOrder.delete({ where: { id } });
}
