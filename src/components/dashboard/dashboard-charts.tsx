"use client";

import { useRef } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";
import { navigateToAnchor } from "@/lib/dashboard-nav";
import type { MonthlyPoint } from "@/modules/dashboard/service";

type DashboardChartsProps = {
  kpis: {
    income: number;
    expense: number;
    obligations: number;
    paidToCounterparties: number;
  };
  series: MonthlyPoint[];
  year?: number;
  selectedMonth?: number | null;
  onMonthSelect?: (month: number | null) => void;
};

const PIE_COLORS = [
  "var(--accent)",
  "var(--negative)",
  "var(--positive)",
  "var(--muted)",
];

const FLOW_ANCHORS: Record<string, string> = {
  Доход: "#income",
  Расход: "#expenses",
  Обязательства: "#expenses",
  "Оплачено К/А": "#expenses",
};

function resetChartHighlight(container: HTMLElement | null) {
  if (!container) return;

  container.querySelector<HTMLElement>(".recharts-wrapper")?.dispatchEvent(
    new MouseEvent("mouseleave", { bubbles: true, cancelable: true }),
  );

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}
export function DashboardCharts({
  kpis,
  series,
  year,
  selectedMonth = null,
  onMonthSelect,
}: DashboardChartsProps) {
  const donutRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const pieData = [
    { name: "Доход", value: kpis.income, color: "var(--positive)" },
    { name: "Расход", value: kpis.expense, color: "var(--negative)" },
    { name: "Обязательства", value: kpis.obligations, color: "var(--accent)" },
    { name: "Оплачено К/А", value: kpis.paidToCounterparties, color: "var(--muted)" },
  ].filter((d) => d.value > 0);

  const barData = series.map((p) => ({
    month: p.month,
    label: p.label,
    income: p.income,
    expense: p.expense,
    net: p.income - p.expense,
  }));

  const totalFlow = pieData.reduce((s, d) => s + d.value, 0);

  function handleFlowClick(name: string) {
    const anchor = FLOW_ANCHORS[name];
    if (anchor) navigateToAnchor(anchor);
    window.setTimeout(() => resetChartHighlight(donutRef.current), 0);
  }

  function handleMonthClick(month: number) {
    if (!year || !onMonthSelect) return;
    if (month < 1 || month > 12) return;
    onMonthSelect(selectedMonth === month ? null : month);
    window.setTimeout(() => resetChartHighlight(barRef.current), 0);
  }

  const yearLabel = year ? String(year) : "все время";
  const monthlyView = year != null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel chart-panel">
        <div className="chart-panel-head">
          <h2 className="font-[family-name:var(--font-display)] text-lg">Структура потоков</h2>
          <p className="text-xs text-[var(--muted)]">
            {yearLabel} · {formatMoney(totalFlow)} всего · нажмите сегмент
          </p>
        </div>
        {pieData.length === 0 ? (
          <p className="chart-empty">Нет данных для диаграммы</p>
        ) : (
          <>
            <div className="chart-donut-wrap" ref={donutRef}>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    stroke="var(--surface)"
                    strokeWidth={2}
                    className="chart-pie-interactive"
                    onClick={(entry) => handleFlowClick(String(entry.name))}
                  >                    {pieData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color ?? PIE_COLORS[i % PIE_COLORS.length]}
                        className="chart-pie-cell"
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(Number(v ?? 0))} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="chart-flow-legend">
              {pieData.map((entry) => (
                <li key={entry.name}>
                  <button
                    type="button"
                    className="chart-flow-legend-btn"
                    onClick={() => handleFlowClick(entry.name)}
                  >
                    <span
                      className="chart-flow-legend-dot"
                      style={{ background: entry.color }}
                      aria-hidden
                    />
                    <span className="chart-flow-legend-label">{entry.name}</span>
                    <span className="chart-flow-legend-value">{formatMoney(entry.value)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="panel chart-panel">
        <div className="chart-panel-head">
          <h2 className="font-[family-name:var(--font-display)] text-lg">Доход vs расход по месяцам</h2>
          <p className="text-xs text-[var(--muted)]">
            {monthlyView
              ? "Нажмите месяц, чтобы увидеть детали"
              : "Сводка по годам · выберите год для помесячной детализации"}
          </p>
        </div>
        <div className="chart-bar-wrap" ref={barRef}>          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  Math.abs(Number(v)) >= 1_000_000
                    ? `${(Number(v) / 1_000_000).toFixed(1)}M`
                    : Math.abs(Number(v)) >= 1_000
                      ? `${(Number(v) / 1_000).toFixed(0)}K`
                      : String(v)
                }
              />
              <Tooltip
                formatter={(v, name) => [
                  formatMoney(Number(v ?? 0)),
                  name === "income" ? "Доход" : name === "expense" ? "Расход" : "Чистый",
                ]}
                labelFormatter={(label) => `${label} · нажмите для деталей`}
                cursor={false}
              />
              <Legend formatter={(v) => (v === "income" ? "Доход" : v === "expense" ? "Расход" : "Чистый")} />
              <Bar
                dataKey="income"
                fill="var(--positive)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                className="chart-bar-interactive"
                onClick={
                  monthlyView
                    ? (entry) => handleMonthClick(Number(entry.payload?.month))
                    : undefined
                }
                fillOpacity={0.92}
                activeBar={false}
              />
              <Bar
                dataKey="expense"
                fill="var(--negative)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
                className="chart-bar-interactive"
                onClick={
                  monthlyView
                    ? (entry) => handleMonthClick(Number(entry.payload?.month))
                    : undefined
                }
                fillOpacity={0.92}
                activeBar={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {monthlyView && selectedMonth != null ? (
          <p className="chart-month-hint">
            Выбран: {barData.find((p) => p.month === selectedMonth)?.label ?? selectedMonth} · детали ниже
          </p>
        ) : null}
      </div>
    </div>
  );
}
