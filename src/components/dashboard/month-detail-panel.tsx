"use client";

import { getMonth } from "date-fns";
import { formatMoney } from "@/lib/money";
import { navigateToAnchor } from "@/lib/dashboard-nav";
import type { ExpenseHubRow, IncomeHubRow } from "@/modules/dashboard/service";
import { HighlightText } from "@/components/dashboard/highlight-text";

const MONTH_NAMES = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

function isCancelledIncome(status: string) {
  return status.trim().toLowerCase() === "отменено";
}

export function filterIncomeByMonth(rows: IncomeHubRow[], year: number, month: number) {
  return rows.filter((row) => {
    if (isCancelledIncome(row.status)) return false;
    if (row.year !== year) return false;
    return getMonth(new Date(row.receivedAt)) + 1 === month;
  });
}

export function filterExpenseByMonth(rows: ExpenseHubRow[], year: number, month: number) {
  return rows.filter((row) => {
    if (row.year !== year) return false;
    return getMonth(new Date(row.registeredAt)) + 1 === month;
  });
}

export function MonthDetailPanel({
  month,
  year,
  incomeRows,
  expenseRows,
  query = "",
  onClose,
}: {
  month: number;
  year: number;
  incomeRows: IncomeHubRow[];
  expenseRows: ExpenseHubRow[];
  query?: string;
  onClose: () => void;
}) {
  const monthIncome = filterIncomeByMonth(incomeRows, year, month);
  const monthExpense = filterExpenseByMonth(expenseRows, year, month);
  const incomeTotal = monthIncome.reduce((sum, row) => sum + row.amount, 0);
  const expenseTotal = monthExpense.reduce((sum, row) => sum + row.totalToPay, 0);
  const net = incomeTotal - expenseTotal;

  return (
    <section className="panel month-detail-panel">
      <div className="month-detail-head">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-lg">
            {MONTH_NAMES[month - 1]} {year}
          </h3>
          <p className="text-xs text-[var(--muted)]">
            {monthIncome.length + monthExpense.length} записей · нажмите строку, чтобы перейти
          </p>
        </div>
        <button type="button" className="btn-ghost btn-inline" onClick={onClose}>
          Закрыть
        </button>
      </div>

      <div className="month-detail-kpis">
        <div className="month-detail-kpi month-detail-kpi-positive">
          <span className="month-detail-kpi-label">Доход</span>
          <span className="month-detail-kpi-value">{formatMoney(incomeTotal)}</span>
        </div>
        <div className="month-detail-kpi month-detail-kpi-negative">
          <span className="month-detail-kpi-label">Расход</span>
          <span className="month-detail-kpi-value">{formatMoney(expenseTotal)}</span>
        </div>
        <div className={`month-detail-kpi ${net >= 0 ? "month-detail-kpi-positive" : "month-detail-kpi-negative"}`}>
          <span className="month-detail-kpi-label">Чистый поток</span>
          <span className="month-detail-kpi-value">{formatMoney(net)}</span>
        </div>
      </div>

      <div className="month-detail-columns">
        <div className="month-detail-column">
          <div className="month-detail-column-head">
            <h4 className="font-medium">Доходы</h4>
            <button
              type="button"
              className="month-detail-link"
              onClick={() => navigateToAnchor("#income")}
            >
              В раздел →
            </button>
          </div>
          {monthIncome.length === 0 ? (
            <p className="month-detail-empty">За этот месяц доходов нет</p>
          ) : (
            <ul className="month-detail-list">
              {monthIncome.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="month-detail-item"
                    onClick={() => navigateToAnchor(`#income-row-${row.id}`, "center")}
                  >
                    <span className="month-detail-item-title">
                      <HighlightText text={row.payer || "Плательщик"} query={query} />
                    </span>
                    <span className="month-detail-item-sub">
                      <HighlightText text={row.project || "Проект"} query={query} />
                    </span>
                    <span className="month-detail-item-amount text-[var(--positive)]">
                      {formatMoney(row.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="month-detail-column">
          <div className="month-detail-column-head">
            <h4 className="font-medium">Расходы</h4>
            <button
              type="button"
              className="month-detail-link"
              onClick={() => navigateToAnchor("#expenses")}
            >
              В раздел →
            </button>
          </div>
          {monthExpense.length === 0 ? (
            <p className="month-detail-empty">За этот месяц расходов нет</p>
          ) : (
            <ul className="month-detail-list">
              {monthExpense.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="month-detail-item"
                    onClick={() => navigateToAnchor(`#expense-row-${row.id}`, "center")}
                  >
                    <span className="month-detail-item-title">
                      <HighlightText text={row.recipient || "Получатель"} query={query} />
                    </span>
                    <span className="month-detail-item-sub">
                      <HighlightText text={row.task || "Задача"} query={query} />
                    </span>
                    <span className="month-detail-item-amount text-[var(--negative)]">
                      {formatMoney(row.totalToPay)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
