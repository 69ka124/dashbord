import { prisma } from "@/lib/prisma";
import { DEFAULT_COUNTERPARTY_LIMIT, nextCounterpartyCode } from "@/lib/codes";
import { toNumber } from "@/lib/money";
import { sumCounterpartyUsage } from "@/modules/expense/service";
export async function listWorkTypes(includeInactive = true) {
  return prisma.workType.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: { name: "asc" },
  });
}

export async function ensureWorkTypeByName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Укажите тип работы");
  }
  const existing = await prisma.workType.findUnique({ where: { name: trimmed } });
  if (existing) {
    if (!existing.active) {
      return prisma.workType.update({
        where: { id: existing.id },
        data: { active: true },
      });
    }
    return existing;
  }
  return prisma.workType.create({
    data: { name: trimmed, active: true },
  });
}

export async function createWorkType(input: { name: string; active?: boolean }) {
  return prisma.workType.create({
    data: {
      name: input.name.trim(),
      active: input.active ?? true,
    },
  });
}

export async function updateWorkType(
  id: string,
  input: { name: string; active: boolean },
) {
  return prisma.workType.update({
    where: { id },
    data: {
      name: input.name.trim(),
      active: input.active,
    },
  });
}

export async function deleteWorkType(id: string) {
  const count = await prisma.work.count({ where: { workTypeId: id } });
  if (count > 0) {
    throw new Error("Нельзя удалить тип: есть связанные работы");
  }
  return prisma.workType.delete({ where: { id } });
}

export async function listCounterparties() {
  return prisma.counterparty.findMany({
    include: { limits: { orderBy: { year: "desc" } } },
    orderBy: { name: "asc" },
  });
}

export type CounterpartyInput = {
  code?: string;
  name: string;
  shortTabName?: string;
  recipientType?: string;
  tabName?: string;
  legalName?: string;
  inn?: string;
  mainCategory?: string;
  contractFolder?: string;
  responsible?: string;
  limitControl?: string;
  separateTab?: boolean;
  status?: string;
  comment?: string;
  contact?: string;
};

function counterpartyData(input: CounterpartyInput) {
  return {
    code: input.code?.trim() || null,
    name: input.name.trim(),
    shortTabName: input.shortTabName?.trim() || null,
    recipientType: input.recipientType?.trim() || null,
    tabName: input.tabName?.trim() || null,
    legalName: input.legalName?.trim() || null,
    inn: input.inn?.trim() || null,
    mainCategory: input.mainCategory?.trim() || null,
    contractFolder: input.contractFolder?.trim() || null,
    responsible: input.responsible?.trim() || null,
    limitControl: input.limitControl?.trim() || null,
    separateTab: Boolean(input.separateTab),
    status: input.status?.trim() || "активен",
    comment: input.comment?.trim() || null,
    contact: input.contact?.trim() || null,
  };
}

export async function createCounterparty(input: CounterpartyInput) {
  const code = input.code?.trim() || (await nextCounterpartyCode());
  const created = await prisma.counterparty.create({
    data: counterpartyData({
      ...input,
      code,
      limitControl: input.limitControl?.trim() || String(DEFAULT_COUNTERPARTY_LIMIT),
    }),
  });

  const year = new Date().getFullYear();
  await upsertCounterpartyLimit({
    counterpartyId: created.id,
    year,
    annualLimit: DEFAULT_COUNTERPARTY_LIMIT,
  });

  return created;
}

export async function updateCounterparty(id: string, input: CounterpartyInput) {
  const existing = await prisma.counterparty.findUniqueOrThrow({ where: { id } });
  return prisma.counterparty.update({
    where: { id },
    data: counterpartyData({
      ...input,
      code: input.code?.trim() || existing.code || undefined,
    }),
  });
}

export async function deleteCounterparty(id: string) {
  const [works, payments, expenses] = await Promise.all([
    prisma.work.count({ where: { counterpartyId: id } }),
    prisma.payment.count({ where: { counterpartyId: id } }),
    prisma.expenseRecord.count({ where: { counterpartyId: id } }),
  ]);
  if (works > 0 || payments > 0 || expenses > 0) {
    throw new Error("Нельзя удалить контрагента: есть связанные записи");
  }
  return prisma.counterparty.delete({ where: { id } });
}

export async function upsertCounterpartyLimit(input: {
  counterpartyId: string;
  year: number;
  annualLimit?: number;
}) {
  const annualLimit = DEFAULT_COUNTERPARTY_LIMIT;
  return prisma.counterpartyLimit.upsert({
    where: {
      counterpartyId_year: {
        counterpartyId: input.counterpartyId,
        year: input.year,
      },
    },
    create: {
      counterpartyId: input.counterpartyId,
      year: input.year,
      annualLimit,
    },
    update: {
      annualLimit,
    },
  });
}

export async function deleteCounterpartyLimit(id: string) {
  return prisma.counterpartyLimit.delete({ where: { id } });
}

export type CounterpartyDirectoryRow = {
  id: string;
  code: string | null;
  name: string;
  shortTabName: string | null;
  recipientType: string | null;
  tabName: string | null;
  limitYear: number | null;
  annualLimit: number | null;
  obligations: number;
  paid: number;
  used: number;
  remaining: number | null;
  percent: number | null;
  legalName: string | null;
  inn: string | null;
  mainCategory: string | null;
  contractFolder: string | null;
  responsible: string | null;
  limitControl: string | null;
  separateTab: boolean;
  status: string;
  comment: string | null;
  limitId: string | null;
};

async function computeUsage(counterpartyId: string, counterpartyName: string, year?: number) {
  return sumCounterpartyUsage(counterpartyId, counterpartyName, year);
}

export async function getCounterpartyDirectory(
  year?: number,
): Promise<CounterpartyDirectoryRow[]> {
  const counterparties = await prisma.counterparty.findMany({
    include: { limits: true },
    orderBy: { name: "asc" },
  });

  const rows: CounterpartyDirectoryRow[] = [];

  for (const ca of counterparties) {
    const limitYear = year ?? new Date().getFullYear();
    const yearLimit = ca.limits.find((l) => l.year === limitYear) ?? ca.limits[0] ?? null;
    const usage = await computeUsage(ca.id, ca.name, year);
    const annualLimit = DEFAULT_COUNTERPARTY_LIMIT;
    const remaining = annualLimit - usage.used;
    const percent = annualLimit > 0 ? (usage.used / annualLimit) * 100 : null;

    rows.push({
      id: ca.id,
      code: ca.code,
      name: ca.name,
      shortTabName: ca.shortTabName,
      recipientType: ca.recipientType,
      tabName: ca.tabName,
      limitYear: yearLimit?.year ?? limitYear,
      annualLimit,
      obligations: usage.obligations,
      paid: usage.paid,
      used: usage.used,
      remaining,
      percent,
      legalName: ca.legalName,
      inn: ca.inn,
      mainCategory: ca.mainCategory,
      contractFolder: ca.contractFolder,
      responsible: ca.responsible,
      limitControl: ca.limitControl,
      separateTab: ca.separateTab,
      status: ca.status,
      comment: ca.comment,
      limitId: yearLimit?.id ?? null,
    });
  }

  return rows;
}

export type CounterpartyLimitRow = {
  id: string;
  counterpartyId: string;
  counterpartyName: string;
  year: number;
  annualLimit: number;
  obligations: number;
  paid: number;
  used: number;
  remaining: number;
  percent: number;
};

export async function getCounterpartyLimits(year?: number): Promise<CounterpartyLimitRow[]> {
  const limitsYear = year ?? new Date().getFullYear();
  const directory = await getCounterpartyDirectory(year);
  return directory.map((row) => {
    const annualLimit = DEFAULT_COUNTERPARTY_LIMIT;
    const used = row.used;
    const remaining = annualLimit - used;
    const percent = annualLimit > 0 ? (used / annualLimit) * 100 : 0;
    return {
      id: row.limitId ?? row.id,
      counterpartyId: row.id,
      counterpartyName: row.name,
      year: row.limitYear ?? limitsYear,
      annualLimit,
      obligations: row.obligations,
      paid: row.paid,
      used,
      remaining,
      percent,
    };
  });
}
