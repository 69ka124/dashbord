import { getQuarter, getYear } from "date-fns";
import { Prisma } from "@prisma/client";
import { nextIncomeCode } from "@/lib/codes";
import { yearBounds } from "@/lib/year-filter";import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/money";

export type IncomeFilters = {
  q?: string;
  status?: string;
  incomeKind?: string;
  year?: number;
  quarter?: number;
};

export type IncomeRow = {
  id: string;
  incomeCode: string;
  receivedAt: Date;
  year: number;
  quarter: number;
  incomeKind: string;
  payer: string;
  project: string;
  amount: number;
  status: string;
  documents: string | null;
  source: string | null;
};

function enrich(record: {
  id: string;
  incomeCode: string;
  receivedAt: Date;
  incomeKind: string;
  payer: string;
  project: string;
  amount: Prisma.Decimal | number;
  status: string;
  documents: string | null;
  source: string | null;
}): IncomeRow {
  return {
    id: record.id,
    incomeCode: record.incomeCode,
    receivedAt: record.receivedAt,
    year: getYear(record.receivedAt),
    quarter: getQuarter(record.receivedAt),
    incomeKind: record.incomeKind,
    payer: record.payer,
    project: record.project,
    amount: toNumber(record.amount),
    status: record.status,
    documents: record.documents,
    source: record.source,
  };
}

export async function listIncomeRecords(filters: IncomeFilters = {}): Promise<IncomeRow[]> {
  const where: Prisma.IncomeRecordWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.incomeKind) where.incomeKind = filters.incomeKind;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { incomeCode: { contains: q } },
      { payer: { contains: q } },
      { project: { contains: q } },
      { documents: { contains: q } },
      { source: { contains: q } },
    ];
  }

  if (filters.year) {
    const { from, to } = yearBounds(filters.year);
    where.receivedAt = { gte: from, lte: to };
  }

  const records = await prisma.incomeRecord.findMany({
    where,
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
  });

  let rows = records.map(enrich);

  if (filters.quarter) {
    rows = rows.filter((r) => r.quarter === filters.quarter);
  }

  return rows;
}

export async function createIncomeRecord(input: {
  incomeCode?: string;
  receivedAt: Date;
  incomeKind: string;
  payer: string;
  project: string;
  amount: number;
  status: string;
  documents?: string;
  source?: string;
}) {
  const incomeCode = input.incomeCode?.trim() || (await nextIncomeCode());
  return prisma.incomeRecord.create({
    data: {
      incomeCode,
      receivedAt: input.receivedAt,
      incomeKind: input.incomeKind.trim(),
      payer: input.payer.trim(),
      project: input.project.trim(),
      amount: input.amount,
      status: input.status.trim() || "план",
      documents: input.documents?.trim() || null,
      source: input.source?.trim() || null,
    },
  });
}

export async function updateIncomeRecord(
  id: string,
  input: {
    incomeCode?: string;
    receivedAt: Date;
    incomeKind: string;
    payer: string;
    project: string;
    amount: number;
    status: string;
    documents?: string;
    source?: string;
  },
) {
  const existing = await prisma.incomeRecord.findUniqueOrThrow({ where: { id } });
  return prisma.incomeRecord.update({
    where: { id },
    data: {
      incomeCode: input.incomeCode?.trim() || existing.incomeCode,
      receivedAt: input.receivedAt,
      incomeKind: input.incomeKind.trim(),
      payer: input.payer.trim(),
      project: input.project.trim(),
      amount: input.amount,
      status: input.status.trim() || "план",
      documents: input.documents?.trim() || null,
      source: input.source?.trim() || null,
    },
  });
}

export async function deleteIncomeRecord(id: string) {
  return prisma.incomeRecord.delete({ where: { id } });
}
