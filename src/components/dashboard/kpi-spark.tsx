"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/money";

export type SparkPoint = { label: string; value: number };

export function KpiSparkCard({
  label,
  value,
  hint,
  deltaPct,
  series,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
  deltaPct: number | null;
  series: SparkPoint[];
  tone?: "default" | "positive" | "negative" | "accent";
}) {
  const toneClass =
    tone === "positive"
      ? "text-[var(--positive)]"
      : tone === "negative"
        ? "text-[var(--negative)]"
        : tone === "accent"
          ? "text-[var(--accent)]"
          : "text-[var(--ink)]";

  const stroke =
    tone === "negative" ? "var(--negative)" : "var(--accent)";
  const fillId = `spark-${label.replace(/\s+/g, "-")}`;

  const deltaLabel =
    deltaPct == null
      ? "нет базы"
      : `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}% к пр. году`;

  const deltaClass =
    deltaPct == null
      ? "text-[var(--muted)]"
      : deltaPct >= 0
        ? tone === "negative"
          ? "kpi-delta-down"
          : "kpi-delta-up"
        : tone === "negative"
          ? "kpi-delta-up"
          : "kpi-delta-down";

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <span className={`text-xs tabular-nums ${deltaClass}`}>{deltaLabel}</span>
      </div>
      <p className={`mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums ${toneClass}`}>
        {formatMoney(value)}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--muted)]">{hint}</p> : null}
      <div className="kpi-spark">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              formatter={(v) => formatMoney(Number(v ?? 0))}
              labelFormatter={(l) => String(l)}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid var(--line)",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={stroke}
              fill={`url(#${fillId})`}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function StatusPill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "ok" | "warn" | "bad" | "muted";
}) {
  const cls =
    tone === "ok"
      ? "status-pill status-pill-ok"
      : tone === "warn"
        ? "status-pill status-pill-warn"
        : tone === "bad"
          ? "status-pill status-pill-bad"
          : "status-pill status-pill-muted";
  return <span className={cls}>{children}</span>;
}

export function paymentStatusTone(status: string): "ok" | "warn" | "bad" | "muted" {
  const s = status.trim().toLowerCase();
  if (s.includes("оплачен") && !s.includes("не")) return "ok";
  if (s.includes("частич")) return "warn";
  if (s.includes("не оплач")) return "bad";
  return "muted";
}

export function incomeStatusTone(status: string): "ok" | "warn" | "bad" | "muted" {
  const s = status.trim().toLowerCase();
  if (s === "получено") return "ok";
  if (s === "частично" || s === "план") return "warn";
  if (s === "отменено") return "bad";
  return "muted";
}
