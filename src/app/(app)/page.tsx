import { canEdit, requireAccess } from "@/lib/access";
import { listCategoryPresets, listIncomeKindPresets } from "@/lib/presets";
import { parseYearParam, yearFilterOptions } from "@/lib/year-filter";
import {
  getDashboardData,
  toExpenseHubRows,
  toIncomeHubRows,
} from "@/modules/dashboard/service";
import { DashboardHub } from "@/components/dashboard/dashboard-hub";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const access = await requireAccess("view");
  const editable = canEdit(access);
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year =
    params.year === undefined
      ? currentYear
      : params.year === ""
        ? undefined
        : parseYearParam(params.year);
  const years = yearFilterOptions(currentYear);

  const [data, incomeKinds, categoryPresets] = await Promise.all([
    getDashboardData({ year }),
    listIncomeKindPresets(),
    listCategoryPresets(),
  ]);

  return (
    <DashboardHub
      key={year ?? "all"}
      years={years}
      selectedYear={year}
      editable={editable}
      incomeRows={toIncomeHubRows(data.incomeRows)}
      expenseRows={toExpenseHubRows(data.expenseRows)}
      prevIncomeRows={toIncomeHubRows(data.prevIncomeRows)}
      prevExpenseRows={toExpenseHubRows(data.prevExpenseRows)}
      counterpartyLimits={data.counterpartyLimits}
      signalContext={data.signalContext}
      incomeKinds={incomeKinds}
      categoryPresets={categoryPresets}
    />
  );
}
