"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useMemo, useState } from "react";
import type { DashboardSignalContext } from "@/lib/dashboard-signals";
import type { CounterpartyLimitRow } from "@/modules/catalog/service";
import type { ExpenseHubRow, IncomeHubRow } from "@/modules/dashboard/service";
import { buildDashboardView } from "@/lib/dashboard-search";
import { formatMoney } from "@/lib/money";
import { AnomalyFeed } from "@/components/dashboard/anomaly-feed";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { MonthDetailPanel } from "@/components/dashboard/month-detail-panel";
import {
  DashboardExpenseSection,
  DashboardIncomeSection,
} from "@/components/dashboard/expandable-ledger";
import { HighlightText } from "@/components/dashboard/highlight-text";
import { KpiSparkCard } from "@/components/dashboard/kpi-spark";
import { EmptyState, LimitBar } from "@/components/ui";

type DashboardHubProps = {
  years: number[];
  selectedYear?: number;
  editable: boolean;
  incomeRows: IncomeHubRow[];
  expenseRows: ExpenseHubRow[];
  prevIncomeRows: IncomeHubRow[];
  prevExpenseRows: ExpenseHubRow[];
  counterpartyLimits: CounterpartyLimitRow[];
  signalContext: DashboardSignalContext;
  incomeKinds?: string[];
  categoryPresets?: string[];
};
export function DashboardHub({
  years,
  selectedYear,
  editable,
  incomeRows,
  expenseRows,
  prevIncomeRows,
  prevExpenseRows,
  counterpartyLimits,
  signalContext,
  incomeKinds,
  categoryPresets,
}: DashboardHubProps) {
  const [query] = useQueryState("q", parseAsString.withDefault(""));
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  useEffect(() => {
    setSelectedMonth(null);
  }, [selectedYear]);

  const view = useMemo(
    () =>
      buildDashboardView({
        year: selectedYear,
        q: query,
        incomeRows,
        expenseRows,
        prevIncomeRows,
        prevExpenseRows,
        counterpartyLimits,
        signalContext,
      }),
    [
      selectedYear,
      query,
      incomeRows,
      expenseRows,
      prevIncomeRows,
      prevExpenseRows,
      counterpartyLimits,
      signalContext,
    ],
  );

  const yearLabel = selectedYear ? String(selectedYear) : "все время";

  const incomeSeries = view.series.map((p) => ({ label: p.label, value: p.income }));
  const expenseSeries = view.series.map((p) => ({ label: p.label, value: p.expense }));
  const obligationsSeries = view.series.map((p) => ({
    label: p.label,
    value: p.obligations,
  }));
  const paidSeries = view.series.map((p) => ({ label: p.label, value: p.paid }));

  const searching = query.trim().length > 0;

  return (
    <div className="space-y-6">
      <DashboardToolbar years={years} selectedYear={selectedYear} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiSparkCard
          label="Доход"
          value={view.kpis.income}
          tone="positive"
          hint={searching ? `Совпадения · ${yearLabel}` : `За ${yearLabel}`}
          deltaPct={view.kpis.incomeDeltaPct}
          series={incomeSeries}
        />
        <KpiSparkCard
          label="Расход"
          value={view.kpis.expense}
          tone="negative"
          hint={searching ? `Совпадения · ${yearLabel}` : `За ${yearLabel}`}
          deltaPct={view.kpis.expenseDeltaPct}
          series={expenseSeries}
        />
        <KpiSparkCard
          label="Доход АБ"
          value={view.kpis.incomeAb}
          tone="positive"
          hint={searching ? `Вид «АБ» · ${yearLabel}` : `Вид дохода АБ · ${yearLabel}`}
          deltaPct={view.kpis.incomeAbDeltaPct}
          series={incomeSeries}
        />
        <KpiSparkCard
          label="Текущие обязательства"
          value={view.kpis.obligations}
          tone="accent"
          hint={searching ? "По совпадениям" : "Неоплаченные расходы"}
          deltaPct={view.kpis.obligationsDeltaPct}
          series={obligationsSeries}
        />
        <KpiSparkCard
          label="Оплачено контрагентам"
          value={view.kpis.paidToCounterparties}
          tone="default"
          hint={searching ? `По совпадениям · ${yearLabel}` : `Статус «оплачено» · ${yearLabel}`}
          deltaPct={view.kpis.paidDeltaPct}
          series={paidSeries}
        />
      </div>

      <DashboardCharts
        kpis={view.kpis}
        series={view.series}
        year={selectedYear}
        selectedMonth={selectedMonth}
        onMonthSelect={setSelectedMonth}
      />

      {selectedMonth != null && selectedYear != null ? (
        <MonthDetailPanel
          month={selectedMonth}
          year={selectedYear}
          incomeRows={incomeRows}
          expenseRows={expenseRows}
          query={query}
          onClose={() => setSelectedMonth(null)}
        />
      ) : null}

      <AnomalyFeed
        items={view.anomalies}
        year={selectedYear}
        query={query}
      />

      <div id="income" className="scroll-mt-28">
        <DashboardIncomeSection
          rows={view.incomeRows}
          editable={editable}
          query={query}
          incomeKinds={incomeKinds}
        />
      </div>

      <div id="expenses" className="scroll-mt-28">
        <DashboardExpenseSection
          rows={view.expenseRows}
          editable={editable}
          query={query}
          categoryPresets={categoryPresets}
        />
      </div>

      <section id="limits" className="space-y-3 scroll-mt-28">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-xl">Лимиты у контрагентов</h2>
          <a href="/counterparties" className="text-sm text-[var(--accent)] hover:underline">
            Управление лимитами →
          </a>
        </div>
        {view.counterpartyLimits.length === 0 ? (
          <EmptyState
            title={searching ? "Совпадений в лимитах нет" : "Лимитов на этот год нет"}
            hint={
              searching
                ? "Попробуйте другое слово или очистите поиск."
                : "Откройте контрагента и задайте годовой лимит."
            }
          />
        ) : (
          <>
            <div className="limit-ring-grid">
              {view.counterpartyLimits.map((row) => (
                <div
                  key={`bar-${row.id}`}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
                >
                  <LimitBar
                    name={row.counterpartyName}
                    used={row.used}
                    limit={row.annualLimit}
                    nameRenderer={(name) => <HighlightText text={name} query={query} />}
                  />
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Остаток {formatMoney(row.remaining)} · {row.percent.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>К/А</th>
                    <th>Год</th>
                    <th className="text-right">Годовой лимит</th>
                    <th className="text-right">Текущие обязательства</th>
                    <th className="text-right">Оплачено</th>
                    <th className="text-right">Использовано</th>
                    <th className="text-right">Остаток</th>
                    <th className="text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {view.counterpartyLimits.map((row) => (
                    <tr key={row.id} id={`limit-row-${row.id}`}>
                      <td className="font-medium">
                        <HighlightText text={row.counterpartyName} query={query} />
                      </td>
                      <td>{row.year}</td>
                      <td className="text-right tabular-nums">
                        {formatMoney(row.annualLimit)}
                      </td>
                      <td className="text-right tabular-nums">
                        {formatMoney(row.obligations)}
                      </td>
                      <td className="text-right tabular-nums">{formatMoney(row.paid)}</td>
                      <td className="text-right tabular-nums">{formatMoney(row.used)}</td>
                      <td
                        className={`text-right tabular-nums ${row.remaining < 0 ? "text-[var(--negative)]" : ""}`}
                      >
                        {formatMoney(row.remaining)}
                      </td>
                      <td
                        className={`text-right tabular-nums ${row.percent > 100 ? "text-[var(--negative)] font-medium" : "text-[var(--accent)]"}`}
                      >
                        {row.percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
