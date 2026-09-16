import { prisma } from "@/lib/prisma";
import { listWorkTypes } from "@/modules/catalog/service";

export const BASE_INCOME_KINDS = ["услуги", "лицензия", "возмещение", "АБ", "прочее"] as const;

export const BASE_EXPENSE_CATEGORIES = ["подряд", "материалы", "лицензии", "прочее"] as const;

export async function listIncomeKindPresets(): Promise<string[]> {
  const rows = await prisma.incomeRecord.findMany({
    select: { incomeKind: true },
    distinct: ["incomeKind"],
    orderBy: { incomeKind: "asc" },
  });

  return [...new Set([...BASE_INCOME_KINDS, ...rows.map((row) => row.incomeKind.trim()).filter(Boolean)])];
}

export async function listCategoryPresets(): Promise<string[]> {
  const [workTypes, expenseCategories] = await Promise.all([
    listWorkTypes(true),
    prisma.expenseRecord.findMany({
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    }),
  ]);

  return [
    ...new Set([
      ...BASE_EXPENSE_CATEGORIES,
      ...workTypes.map((row) => row.name),
      ...expenseCategories.map((row) => row.category.trim()).filter(Boolean),
    ]),
  ].sort((a, b) => a.localeCompare(b, "ru"));
}

export function isAbIncomeKind(kind: string): boolean {
  const normalized = kind.trim().toLowerCase();
  return normalized === "аб" || normalized === "ab" || normalized.includes("аб");
}
