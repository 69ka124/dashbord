import { differenceInDays, getMonth } from "date-fns";
import { buildOperationalAnomalies, type DashboardSignalContext } from "@/lib/dashboard-signals";
import { isCancelledIncome, isPaidExpense } from "@/lib/finance-status";
import { isAbIncomeKind } from "@/lib/presets";
import { formatMoney } from "@/lib/money";
import type { CounterpartyLimitRow } from "@/modules/catalog/service";
import type {
  DashboardAnomaly,
  ExpenseHubRow,
  IncomeHubRow,
  KpiBundle,
  MonthlyPoint,
} from "@/modules/dashboard/service";

const MONTH_LABELS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек",
];

function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function valuesForSearch(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }
  if (value instanceof Date) return [value.toISOString()];
  if (Array.isArray(value)) return value.flatMap(valuesForSearch);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(valuesForSearch);
  }
  return [];
}

export function matchesQuery(value: unknown, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return valuesForSearch(value).some((part) => part.toLowerCase().includes(needle));
}

export function filterIncomeRows(rows: IncomeHubRow[], query: string) {
  const needle = query.trim();
  if (!needle) return rows;
  return rows.filter((row) => matchesQuery(row, needle));
}

export function filterExpenseRows(rows: ExpenseHubRow[], query: string) {
  const needle = query.trim();
  if (!needle) return rows;
  return rows.filter((row) => matchesQuery(row, needle));
}

export function filterCounterpartyLimits(rows: CounterpartyLimitRow[], query: string) {
  const needle = query.trim();
  if (!needle) return rows;
  return rows.filter((row) => matchesQuery(row, needle));
}

function sumKpis(incomeRows: IncomeHubRow[], expenseRows: ExpenseHubRow[]) {
  const activeIncome = incomeRows.filter((r) => !isCancelledIncome(r.status));
  const income = activeIncome.reduce((sum, r) => sum + r.amount, 0);
  const incomeAb = activeIncome
    .filter((r) => isAbIncomeKind(r.incomeKind))
    .reduce((sum, r) => sum + r.amount, 0);
  const expense = expenseRows.reduce((sum, r) => sum + r.totalToPay, 0);
  const paidToCounterparties = expenseRows
    .filter((r) => isPaidExpense(r.paymentStatus))
    .reduce((sum, r) => sum + r.totalToPay, 0);
  const obligations = expenseRows
    .filter((r) => !isPaidExpense(r.paymentStatus))
    .reduce((sum, r) => sum + r.totalToPay, 0);
  return { income, incomeAb, expense, obligations, paidToCounterparties };
}

function buildMonthlySeries(
  year: number,
  incomeRows: IncomeHubRow[],
  expenseRows: ExpenseHubRow[],
): MonthlyPoint[] {
  const points: MonthlyPoint[] = MONTH_LABELS.map((label, i) => ({
    month: i + 1,
    label,
    income: 0,
    expense: 0,
    paid: 0,
    obligations: 0,
  }));

  for (const row of incomeRows) {
    if (isCancelledIncome(row.status)) continue;
    if (row.year !== year) continue;
    const m = getMonth(new Date(row.receivedAt));
    points[m].income += row.amount;
  }

  for (const row of expenseRows) {
    if (row.year !== year) continue;
    const m = getMonth(new Date(row.registeredAt));
    points[m].expense += row.totalToPay;
    if (isPaidExpense(row.paymentStatus)) {
      points[m].paid += row.totalToPay;
    } else {
      points[m].obligations += row.totalToPay;
    }
  }

  return points;
}

function buildYearlySeries(
  incomeRows: IncomeHubRow[],
  expenseRows: ExpenseHubRow[],
): MonthlyPoint[] {
  const years = new Set<number>();
  for (const row of incomeRows) years.add(row.year);
  for (const row of expenseRows) years.add(row.year);

  return [...years]
    .sort((a, b) => a - b)
    .map((year) => {
      let income = 0;
      let expense = 0;
      let paid = 0;
      let obligations = 0;

      for (const row of incomeRows) {
        if (row.year !== year || isCancelledIncome(row.status)) continue;
        income += row.amount;
      }

      for (const row of expenseRows) {
        if (row.year !== year) continue;
        expense += row.totalToPay;
        if (isPaidExpense(row.paymentStatus)) paid += row.totalToPay;
        else obligations += row.totalToPay;
      }

      return {
        month: year,
        label: String(year),
        income,
        expense,
        paid,
        obligations,
      };
    });
}

function buildAnomalies(
  incomeRows: IncomeHubRow[],
  expenseRows: ExpenseHubRow[],
  limits: CounterpartyLimitRow[],
  signalContext?: DashboardSignalContext,
): DashboardAnomaly[] {  const anomalies: DashboardAnomaly[] = [];
  const seen = new Set<string>();
  const today = new Date();

  function push(item: DashboardAnomaly) {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    anomalies.push(item);
  }

  const unpaid = expenseRows.filter((r) => !isPaidExpense(r.paymentStatus));
  const avgUnpaid =
    unpaid.length > 0
      ? unpaid.reduce((sum, r) => sum + r.totalToPay, 0) / unpaid.length
      : 0;
  const largeThreshold = Math.max(avgUnpaid * 2, 100_000);

  for (const row of unpaid) {
    if (row.totalToPay >= largeThreshold) {
      push({
        id: `unpaid-${row.id}`,
        severity: row.totalToPay >= largeThreshold * 1.5 ? "critical" : "warn",
        title: "Крупное неоплаченное обязательство",
        detail: `${row.recipient} · ${row.task}`,
        amount: row.totalToPay,
        anchor: `#expense-row-${row.id}`,
      });
    }

    const ageDays = differenceInDays(today, new Date(row.registeredAt));
    if (ageDays >= 45 && row.totalToPay >= 50_000 && !seen.has(`unpaid-${row.id}`)) {
      push({
        id: `overdue-${row.id}`,
        severity: ageDays >= 90 ? "critical" : "warn",
        title: "Расход давно не оплачен",
        detail: `${row.recipient} · ${ageDays} дн. без оплаты`,
        amount: row.totalToPay,
        anchor: `#expense-row-${row.id}`,
      });
    }
  }

  for (const row of expenseRows) {
    if (row.paymentStatus !== "частично" || row.totalToPay < 200_000) continue;
    push({
      id: `partial-${row.id}`,
      severity: "warn",
      title: "Крупный расход оплачен частично",
      detail: `${row.recipient} · ${row.task}`,
      amount: row.totalToPay,
      anchor: `#expense-row-${row.id}`,
    });
  }

  for (const row of incomeRows) {
    if (isCancelledIncome(row.status) && row.amount >= 100_000) {
      push({
        id: `cancelled-${row.id}`,
        severity: "warn",
        title: "Отменён крупный доход",
        detail: `${row.payer} · ${row.project}`,
        amount: row.amount,
        anchor: `#income-row-${row.id}`,
      });
    }

    const planned = row.status.trim().toLowerCase();
    if (
      (planned === "план" || planned === "частично") &&
      row.amount >= 50_000 &&
      new Date(row.receivedAt) < today
    ) {
      push({
        id: `stale-income-${row.id}`,
        severity: planned === "план" ? "critical" : "warn",
        title: "Доход не получен в срок",
        detail: `${row.payer} · план на ${row.receivedAt.slice(0, 10)}`,
        amount: row.amount,
        anchor: `#income-row-${row.id}`,
      });
    }
  }

  for (const row of limits) {
    if (row.percent < 90) continue;
    push({
      id: `limit-${row.id}`,
      severity: row.percent >= 100 ? "critical" : "warn",
      title:
        row.percent >= 100
          ? "Лимит контрагента превышен"
          : "Контрагент близок к лимиту",
      detail: `${row.counterpartyName} · ${row.percent.toFixed(1)}% использовано`,
      amount: row.remaining,
      anchor: `#limit-row-${row.id}`,
    });
  }

  const incomeTotal = incomeRows
    .filter((r) => !isCancelledIncome(r.status))
    .reduce((sum, r) => sum + r.amount, 0);
  const obligations = unpaid.reduce((sum, r) => sum + r.totalToPay, 0);
  if (incomeTotal > 0 && obligations / incomeTotal >= 0.35 && obligations >= 300_000) {
    push({
      id: "ratio-obligations",
      severity: obligations / incomeTotal >= 0.5 ? "critical" : "warn",
      title: "Высокая доля неоплаченных обязательств",
      detail: `${((obligations / incomeTotal) * 100).toFixed(0)}% от дохода года`,
      amount: obligations,
      anchor: "#expenses",
    });
  }

  if (signalContext) {
    for (const item of buildOperationalAnomalies(signalContext)) {
      push(item);
    }
  }

  return anomalies
    .sort((a, b) => {
      const rank = (s: DashboardAnomaly["severity"]) => (s === "critical" ? 0 : 1);
      if (rank(a.severity) !== rank(b.severity)) {
        return rank(a.severity) - rank(b.severity);
      }
      return (b.amount ?? 0) - (a.amount ?? 0);
    })
    .slice(0, 20);
}
export type SearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  anchor: string;
};

export type SearchSectionPreview = {
  id: "income" | "expense" | "limits" | "anomalies";
  label: string;
  anchor: string;
  count: number;
  hits: SearchHit[];
};

export type SearchPreview = {
  query: string;
  total: number;
  sections: SearchSectionPreview[];
};

function incomeHit(row: IncomeHubRow): SearchHit {
  return {
    id: row.id,
    title: row.payer || row.incomeCode,
    subtitle: `${row.project} · ${row.status}`,
    anchor: `#income-row-${row.id}`,
  };
}

function expenseHit(row: ExpenseHubRow): SearchHit {
  return {
    id: row.id,
    title: row.recipient || row.expenseCode,
    subtitle: `${row.task} · ${row.paymentStatus}`,
    anchor: `#expense-row-${row.id}`,
  };
}

function limitHit(row: CounterpartyLimitRow): SearchHit {
  return {
    id: row.id,
    title: row.counterpartyName,
    subtitle: `${row.percent.toFixed(1)}% · остаток ${formatMoney(row.remaining)}`,
    anchor: `#limit-row-${row.id}`,
  };
}

function anomalyHit(row: DashboardAnomaly): SearchHit {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.detail,
    anchor: row.anchor,
  };
}

export function buildSearchPreview(input: {
  q?: string;
  incomeRows: IncomeHubRow[];
  expenseRows: ExpenseHubRow[];
  counterpartyLimits: CounterpartyLimitRow[];
  allExpenseRows: ExpenseHubRow[];
  allLimits: CounterpartyLimitRow[];
  signalContext?: DashboardSignalContext;
}): SearchPreview {  const query = input.q?.trim() ?? "";
  if (!query) {
    return { query: "", total: 0, sections: [] };
  }

  const income = filterIncomeRows(input.incomeRows, query);
  const expense = filterExpenseRows(input.expenseRows, query);
  const limits = filterCounterpartyLimits(input.counterpartyLimits, query);
  const allAnomalies = buildAnomalies(
    input.incomeRows,
    input.allExpenseRows,
    input.allLimits,
    input.signalContext,
  );  const anomalies = allAnomalies.filter((item) => matchesQuery(item, query));

  const sections: SearchSectionPreview[] = [
    {
      id: "income" as const,
      label: "Доходы",
      anchor: "#income",
      count: income.length,
      hits: income.slice(0, 4).map(incomeHit),
    },
    {
      id: "expense" as const,
      label: "Расходы",
      anchor: "#expenses",
      count: expense.length,
      hits: expense.slice(0, 4).map(expenseHit),
    },
    {
      id: "anomalies" as const,
      label: "Сигналы",
      anchor: "#signals",
      count: anomalies.length,
      hits: anomalies.slice(0, 3).map(anomalyHit),
    },
    {
      id: "limits" as const,
      label: "Лимиты контрагентов",
      anchor: "#limits",
      count: limits.length,
      hits: limits.slice(0, 4).map(limitHit),
    },
  ].filter((section) => section.count > 0);

  return {
    query,
    total: income.length + expense.length + limits.length + anomalies.length,
    sections,
  };
}

export type DashboardView = {
  q: string;
  kpis: KpiBundle;
  series: MonthlyPoint[];
  incomeRows: IncomeHubRow[];
  expenseRows: ExpenseHubRow[];
  counterpartyLimits: CounterpartyLimitRow[];
  anomalies: DashboardAnomaly[];
  matchCounts: {
    income: number;
    expense: number;
    limits: number;
    anomalies: number;
    total: number;
  };
};

export function buildDashboardView(input: {
  year?: number;
  q?: string;
  incomeRows: IncomeHubRow[];
  expenseRows: ExpenseHubRow[];
  prevIncomeRows: IncomeHubRow[];
  prevExpenseRows: ExpenseHubRow[];
  counterpartyLimits: CounterpartyLimitRow[];
  signalContext?: DashboardSignalContext;
}): DashboardView {
  const q = input.q?.trim() ?? "";
  const incomeRows = filterIncomeRows(input.incomeRows, q);
  const expenseRows = filterExpenseRows(input.expenseRows, q);
  const counterpartyLimits = filterCounterpartyLimits(input.counterpartyLimits, q);

  const prevIncomeRows = filterIncomeRows(input.prevIncomeRows, q);
  const prevExpenseRows = filterExpenseRows(input.prevExpenseRows, q);

  const current = sumKpis(incomeRows, expenseRows);
  const previous = sumKpis(prevIncomeRows, prevExpenseRows);

  const kpis: KpiBundle = {
    ...current,
    incomeDeltaPct: input.year != null ? deltaPct(current.income, previous.income) : null,
    incomeAbDeltaPct: input.year != null ? deltaPct(current.incomeAb, previous.incomeAb) : null,
    expenseDeltaPct: input.year != null ? deltaPct(current.expense, previous.expense) : null,
    obligationsDeltaPct:
      input.year != null ? deltaPct(current.obligations, previous.obligations) : null,
    paidDeltaPct:
      input.year != null
        ? deltaPct(current.paidToCounterparties, previous.paidToCounterparties)
        : null,
  };

  const series =
    input.year != null
      ? buildMonthlySeries(input.year, incomeRows, expenseRows)
      : buildYearlySeries(incomeRows, expenseRows);
  const allAnomalies = buildAnomalies(
    input.incomeRows,
    input.expenseRows,
    input.counterpartyLimits,
    input.signalContext,
  );  const anomalies = q
    ? allAnomalies.filter((item) => matchesQuery(item, q))
    : allAnomalies;

  return {
    q,
    kpis,
    series,
    incomeRows,
    expenseRows,
    counterpartyLimits,
    anomalies,
    matchCounts: {
      income: incomeRows.length,
      expense: expenseRows.length,
      limits: counterpartyLimits.length,
      anomalies: anomalies.length,
      total: incomeRows.length + expenseRows.length + counterpartyLimits.length + anomalies.length,
    },
  };
}
