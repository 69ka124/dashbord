import { getCounterpartyLimits } from "@/modules/catalog/service";
import {
  listExpenseRecords,
  type ExpenseRow,
} from "@/modules/expense/service";
import {
  listIncomeRecords,
  type IncomeRow,
} from "@/modules/income/service";
import { listDesignOrders } from "@/modules/design/service";
import { listProductionOrders } from "@/modules/production/service";
import { listPurchaseItems } from "@/modules/purchases/service";
import { listVacationLeaves } from "@/modules/vacations/service";
import type { DashboardSignalContext } from "@/lib/dashboard-signals";

export type DashboardHubFilters = {
  year?: number;
};

export type MonthlyPoint = {
  month: number;
  label: string;
  income: number;
  expense: number;
  paid: number;
  obligations: number;
};

export type KpiBundle = {
  income: number;
  incomeAb: number;
  expense: number;
  obligations: number;
  paidToCounterparties: number;
  incomeDeltaPct: number | null;
  incomeAbDeltaPct: number | null;
  expenseDeltaPct: number | null;
  obligationsDeltaPct: number | null;
  paidDeltaPct: number | null;
};

export type DashboardAnomaly = {
  id: string;
  severity: "warn" | "critical";
  title: string;
  detail: string;
  amount?: number;
  anchor: string;
};

export async function getDashboardData(filters: DashboardHubFilters = {}) {
  const year = filters.year;
  const limitsYear = year ?? new Date().getFullYear();

  const [
    incomeRows,
    expenseRows,
    prevIncome,
    prevExpense,
    limits,
    productionOrders,
    designOrders,
    purchaseItems,
    vacationLeaves,
    openExpenses,
  ] = await Promise.all([
    listIncomeRecords(year ? { year } : {}),
    listExpenseRecords(year ? { year } : {}),
    year ? listIncomeRecords({ year: year - 1 }) : Promise.resolve([]),
    year ? listExpenseRecords({ year: year - 1 }) : Promise.resolve([]),
    getCounterpartyLimits(limitsYear),
    listProductionOrders(year ? { year } : {}),
    listDesignOrders(year ? { year } : {}),
    listPurchaseItems({}),
    listVacationLeaves(year ? { year } : {}),
    listExpenseRecords({ paymentStatus: undefined }),
  ]);

  const signalContext: DashboardSignalContext = {
    productionOrders,
    designOrders,
    purchaseItems,
    expenseRows: openExpenses.filter(
      (row) => !row.paymentStatus.toLowerCase().includes("оплач"),
    ),
    vacationLeaves,
  };

  return {
    year,
    incomeRows,
    expenseRows,
    prevIncomeRows: prevIncome,
    prevExpenseRows: prevExpense,
    counterpartyLimits: limits,
    signalContext,
  };
}

export type IncomeHubRow = Omit<IncomeRow, "receivedAt"> & {
  receivedAt: string;
};

export type ExpenseHubRow = Omit<ExpenseRow, "registeredAt" | "paidAt" | "dueDate"> & {
  registeredAt: string;
  paidAt: string | null;
  dueDate: string | null;
};

export function toIncomeHubRows(rows: IncomeRow[]): IncomeHubRow[] {
  return rows.map((r) => ({
    ...r,
    receivedAt: r.receivedAt.toISOString(),
  }));
}

export function toExpenseHubRows(rows: ExpenseRow[]): ExpenseHubRow[] {
  return rows.map((r) => ({
    ...r,
    registeredAt: r.registeredAt.toISOString(),
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    dueDate: r.dueDate ? r.dueDate.toISOString() : null,
  }));
}
