import { Prisma } from "@prisma/client";
import { getQuarter, getYear } from "date-fns";
import { getAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";

export type AuditInput = {
  tab: string;
  entityId: string;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  comment?: string | null;
  userLabel?: string;
};

export type AuditRow = {
  id: string;
  createdAt: Date;
  userLabel: string;
  tab: string;
  entityId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  year: number;
  quarter: number;
};

async function resolveUserLabel(explicit?: string) {
  if (explicit) return explicit;
  const access = await getAccess();
  if (!access) return "система";
  if (access.kind === "owner") return access.email;
  return `${access.email} (${access.role})`;
}

function stringifyValue(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("ru-RU").format(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export async function writeAudit(input: AuditInput) {
  const userLabel = await resolveUserLabel(input.userLabel);
  return prisma.auditLog.create({
    data: {
      userLabel,
      tab: input.tab,
      entityId: input.entityId,
      field: input.field,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      comment: input.comment?.trim() || null,
    },
  });
}

export async function auditCreate(tab: string, entityId: string, summary: string) {
  return writeAudit({
    tab,
    entityId,
    field: "создание",
    oldValue: null,
    newValue: summary,
    comment: "Создана запись",
  });
}

export async function auditDelete(tab: string, entityId: string, summary: string) {
  return writeAudit({
    tab,
    entityId,
    field: "удаление",
    oldValue: summary,
    newValue: null,
    comment: "Удалена запись",
  });
}

export async function auditUpdate(
  tab: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields?: string[],
) {
  const keys = fields ?? [...new Set([...Object.keys(before), ...Object.keys(after)])];
  for (const key of keys) {
    const oldValue = stringifyValue(before[key]);
    const newValue = stringifyValue(after[key]);
    if (oldValue === newValue) continue;
    await writeAudit({
      tab,
      entityId,
      field: key,
      oldValue,
      newValue,
      comment: "Изменение поля",
    });
  }
}

/** One-line update when old state is unavailable */
export async function auditAction(
  tab: string,
  entityId: string,
  action: string,
  detail?: string,
) {
  return writeAudit({
    tab,
    entityId,
    field: action,
    oldValue: null,
    newValue: detail ?? null,
    comment: action,
  });
}

export type AuditFilters = {
  q?: string;
  tab?: string;
  userLabel?: string;
  year?: number;
  quarter?: number;
};

export async function listAuditLogs(filters: AuditFilters = {}): Promise<AuditRow[]> {
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.tab) where.tab = filters.tab;
  if (filters.userLabel) where.userLabel = filters.userLabel;
  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { userLabel: { contains: q } },
      { tab: { contains: q } },
      { entityId: { contains: q } },
      { field: { contains: q } },
      { comment: { contains: q } },
      { oldValue: { contains: q } },
      { newValue: { contains: q } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  let rows: AuditRow[] = logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    userLabel: log.userLabel,
    tab: log.tab,
    entityId: log.entityId,
    field: log.field,
    oldValue: log.oldValue,
    newValue: log.newValue,
    comment: log.comment,
    year: getYear(log.createdAt),
    quarter: getQuarter(log.createdAt),
  }));

  if (filters.year) rows = rows.filter((r) => r.year === filters.year);
  if (filters.quarter) rows = rows.filter((r) => r.quarter === filters.quarter);

  return rows;
}

export async function listAuditUsers() {
  const rows = await prisma.auditLog.findMany({
    distinct: ["userLabel"],
    select: { userLabel: true },
    orderBy: { userLabel: "asc" },
  });
  return rows.map((r) => r.userLabel);
}

export async function listAuditTabs() {
  const rows = await prisma.auditLog.findMany({
    distinct: ["tab"],
    select: { tab: true },
    orderBy: { tab: "asc" },
  });
  return rows.map((r) => r.tab);
}
