"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import { navigateToAnchor } from "@/lib/dashboard-nav";
import type { DashboardAnomaly } from "@/modules/dashboard/service";
import { HighlightText } from "@/components/dashboard/highlight-text";

const PREVIEW_COUNT = 2;

function navigateToSignal(anchor: string) {
  navigateToAnchor(anchor, "center");
}

function AnomalyList({
  items,
  query,
}: {
  items: DashboardAnomaly[];
  query: string;
}) {
  return (
    <ul className="anomaly-list">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={`anomaly-item anomaly-item-btn ${item.severity === "critical" ? "anomaly-critical" : "anomaly-warn"}`}
            onClick={() => navigateToSignal(item.anchor)}
          >
            <div className="anomaly-dot" aria-hidden />
            <div className="min-w-0 flex-1 text-left">
              <p className="font-medium text-[var(--ink)]">
                <HighlightText text={item.title} query={query} />
              </p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                <HighlightText text={item.detail} query={query} />
              </p>
            </div>
            {item.amount != null ? (
              <span className="tabular-nums text-sm font-medium text-[var(--ink)]">
                {formatMoney(item.amount)}
              </span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function AnomalyFeed({
  items,
  year,
  query = "",
}: {
  items: DashboardAnomaly[];
  year?: number;
  query?: string;
}) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const periodLabel = year ? `${year}` : "все время";

  const hiddenCount = Math.max(0, items.length - PREVIEW_COUNT);
  const visibleItems = useMemo(
    () => (expanded ? items : items.slice(0, PREVIEW_COUNT)),
    [expanded, items],
  );

  const searching = query.trim().length > 0;

  const subtitle =
    items.length === 0
      ? searching
        ? "совпадений нет"
        : "аномалий не найдено"
      : hiddenCount > 0 && !expanded
        ? `${PREVIEW_COUNT} важных · ещё ${hiddenCount}`
        : `${items.length} событий · нажмите, чтобы перейти`;

  useEffect(() => {
    setExpanded(false);
  }, [items.length, query]);

  useEffect(() => {
    function onOpenSignals() {
      setOpen(true);
      setExpanded(true);
    }

    window.addEventListener("dashboard:open-signals", onOpenSignals);
    return () => window.removeEventListener("dashboard:open-signals", onOpenSignals);
  }, []);

  return (
    <section
      id="signals"
      className={`panel collapsible-form-panel anomaly-panel scroll-mt-28 ${open ? "is-open" : ""}`}
    >
      <button
        type="button"
        className="collapsible-form-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="collapsible-form-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <span className="font-[family-name:var(--font-display)] text-lg">Сигналы</span>
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">
          {periodLabel} · {subtitle}
        </span>
        <span className="collapsible-form-state">{open ? "Скрыть" : "Показать"}</span>
      </button>

      {open ? (
        <div className="collapsible-form-body">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              {searching
                ? "По этому запросу сигналов нет — проверьте доходы, расходы и лимиты ниже."
                : "Отслеживаем: финансы, лимиты К/А, дедлайны продакшна и дизайна, подписки и просроченные оплаты."}
            </p>
          ) : (
            <>
              <AnomalyList items={visibleItems} query={query} />
              {hiddenCount > 0 ? (
                <button
                  type="button"
                  className="anomaly-more-toggle"
                  onClick={() => setExpanded((value) => !value)}
                  aria-expanded={expanded}
                >
                  {expanded ? "Скрыть" : `Показать ещё ${hiddenCount}`}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
