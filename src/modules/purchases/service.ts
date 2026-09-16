import { getYear } from "date-fns";
import { Prisma } from "@prisma/client";
import { yearBounds } from "@/lib/year-filter";
import { prisma } from "@/lib/prisma";import { toNumber } from "@/lib/money";

export type PurchaseFilters = {
  q?: string;
  type?: string;
  status?: string;
  priority?: string;
  subscription?: string;
  year?: number;
};
export type PurchaseRow = {
  id: string;
  type: string;
  title: string;
  comment: string | null;
  paymentDate: Date | null;
  unitPrice: number;
  quantity: number;
  productUrl: string | null;
  subscription: string | null;
  lineTotal: number;
  priority: string;
  status: string;
};

function enrich(item: {
  id: string;
  type: string;
  title: string;
  comment: string | null;
  paymentDate: Date | null;
  unitPrice: Prisma.Decimal | number;
  quantity: number;
  productUrl: string | null;
  subscription: string | null;
  lineTotal: Prisma.Decimal | number;
  priority: string;
  status: string;
}): PurchaseRow {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    comment: item.comment,
    paymentDate: item.paymentDate,
    unitPrice: toNumber(item.unitPrice),
    quantity: item.quantity,
    productUrl: item.productUrl,
    subscription: item.subscription,
    lineTotal: toNumber(item.lineTotal),
    priority: item.priority,
    status: item.status,
  };
}

export async function listPurchaseItems(
  filters: PurchaseFilters = {},
): Promise<PurchaseRow[]> {
  const where: Prisma.PurchaseItemWhereInput = {};
  if (filters.type) where.type = filters.type;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.subscription) where.subscription = filters.subscription;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { title: { contains: q } },
      { comment: { contains: q } },
      { type: { contains: q } },
    ];
  }

  if (filters.year) {
    const { from, to } = yearBounds(filters.year);
    where.paymentDate = { gte: from, lte: to };
  }

  const items = await prisma.purchaseItem.findMany({
    where,
    orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
  });

  return items.map(enrich);
}

export type PurchaseInput = {
  type: string;
  title: string;
  comment?: string;
  paymentDate?: Date | null;
  unitPrice: number;
  quantity: number;
  productUrl?: string;
  subscription?: string;
  priority?: string;
  status?: string;
};

function toData(input: PurchaseInput) {
  const unitPrice = input.unitPrice;
  const quantity = input.quantity > 0 ? input.quantity : 1;
  return {
    type: input.type.trim(),
    title: input.title.trim(),
    comment: input.comment?.trim() || null,
    paymentDate: input.paymentDate ?? null,
    unitPrice,
    quantity,
    productUrl: input.productUrl?.trim() || null,
    subscription: input.subscription?.trim() || null,
    lineTotal: unitPrice * quantity,
    priority: input.priority?.trim() || "средний",
    status: input.status?.trim() || "план",
  };
}

export async function createPurchaseItem(input: PurchaseInput) {
  return prisma.purchaseItem.create({ data: toData(input) });
}

export async function updatePurchaseItem(id: string, input: PurchaseInput) {
  return prisma.purchaseItem.update({ where: { id }, data: toData(input) });
}

export async function deletePurchaseItem(id: string) {
  return prisma.purchaseItem.delete({ where: { id } });
}
