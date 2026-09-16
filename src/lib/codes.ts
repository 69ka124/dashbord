import { prisma } from "@/lib/prisma";

const DEFAULT_COUNTERPARTY_LIMIT = 1_500_000;

export { DEFAULT_COUNTERPARTY_LIMIT };

function maxNumericId(values: Array<string | null | undefined>): number {
  let max = 0;
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) continue;
    max = Math.max(max, Number.parseInt(trimmed, 10));
  }
  return max;
}

function nextNumericId(values: Array<string | null | undefined>): string {
  return String(maxNumericId(values) + 1);
}

export async function nextCounterpartyCode(): Promise<string> {
  const rows = await prisma.counterparty.findMany({
    where: { code: { not: null } },
    select: { code: true },
  });
  return nextNumericId(rows.map((row) => row.code));
}

export async function nextExpenseCode(): Promise<string> {
  const rows = await prisma.expenseRecord.findMany({
    select: { expenseCode: true },
  });
  return nextNumericId(rows.map((row) => row.expenseCode));
}

export async function nextIncomeCode(): Promise<string> {
  const rows = await prisma.incomeRecord.findMany({
    select: { incomeCode: true },
  });
  return nextNumericId(rows.map((row) => row.incomeCode));
}

export async function nextWorkOrderCode(): Promise<string> {
  return nextExpenseCode();
}

export async function nextProductionOrderCode(): Promise<string> {
  const rows = await prisma.productionOrder.findMany({
    select: { orderCode: true },
  });
  return nextNumericId(rows.map((row) => row.orderCode));
}

export async function nextDesignOrderCode(): Promise<string> {
  const rows = await prisma.designOrder.findMany({
    select: { orderCode: true },
  });
  return nextNumericId(rows.map((row) => row.orderCode));
}
