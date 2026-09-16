import type { ReactNode } from "react";
import { formatMoney } from "@/lib/money";

export { CollapsibleFormPanel } from "@/components/ui/collapsible-form-panel";
export { FormField } from "@/components/ui/form-field";

export function KpiCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number;
  hint?: string;
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

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_1px_0_rgba(15,23,22,0.04)]">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className={`mt-2 font-[family-name:var(--font-display)] text-2xl tabular-nums ${toneClass}`}>
        {formatMoney(value)}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 px-6 py-12 text-center">
      <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">{title}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p>
    </div>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
        {title}
      </h1>
      {description ? <p className="mt-1 text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

export function LimitBar({
  name,
  used,
  limit,
  nameRenderer,
}: {
  name: string;
  used: number;
  limit: number;
  nameRenderer?: (name: string) => ReactNode;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const over = limit > 0 && used > limit;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium text-[var(--ink)]">
          {nameRenderer ? nameRenderer(name) : name}
        </span>
        <span className="tabular-nums text-[var(--muted)]">
          {formatMoney(used)} / {formatMoney(limit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--chip)]">
        <div
          className={`h-full rounded-full transition-all ${over ? "bg-[var(--negative)]" : "bg-[var(--accent)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
