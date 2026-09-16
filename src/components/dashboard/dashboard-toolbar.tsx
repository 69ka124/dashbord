"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef, useState, useTransition } from "react";
import { navigateToAnchor } from "@/lib/dashboard-nav";
import { GlobalSearchPanel } from "@/components/global-search-panel";

const yearParser = parseAsString.withOptions({ shallow: false });

type DashboardToolbarProps = {
  years: number[];
  selectedYear?: number;
};

export function DashboardToolbar({ years, selectedYear }: DashboardToolbarProps) {
  const currentYear = new Date().getFullYear();
  const [yearParam, setYearParam] = useQueryState("year", yearParser);
  const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""));
  const [panelOpen, setPanelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const effectiveYear = selectedYear ?? currentYear;
  const yearValue = yearParam === "" ? "" : yearParam ?? String(effectiveYear);

  function navigate(href: string) {
    setPanelOpen(false);
    navigateToAnchor(href);
  }

  function handleYearChange(next: string) {
    startTransition(() => {
      if (next === "") {
        void setYearParam("");
      } else if (next === String(currentYear)) {
        void setYearParam(null);
      } else {
        void setYearParam(next);
      }
    });
  }

  const showPanel = panelOpen && query.trim().length > 0;
  const searchYear = yearValue ? Number(yearValue) : undefined;

  useEffect(() => {
    if (!showPanel) return;

    function onPointerDown(event: MouseEvent) {
      if (!searchWrapRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showPanel]);

  return (
    <section className="dash-control panel">
      <div className="dash-control-top">
        <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)] sm:text-3xl">
          Панель управления
        </h1>

        <div className="dash-control-filters">
          <div ref={searchWrapRef} className="dash-search-wrap">
            <input
              className="field dash-search"
              name="q"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value || null);
                setPanelOpen(true);
              }}
              onFocus={() => setPanelOpen(true)}
              placeholder="Поиск по всему приложению…"
              aria-label="Глобальный поиск"
              aria-expanded={showPanel}
              aria-controls="global-search-panel"
              autoComplete="off"
            />
            <GlobalSearchPanel
              query={query}
              year={searchYear}
              open={showPanel}
              onClose={() => setPanelOpen(false)}
              onNavigate={navigate}
            />
          </div>
          <select
            id="year"
            name="year"
            className="field dash-year"
            value={yearValue}
            onChange={(e) => handleYearChange(e.target.value)}
            aria-label="Год"
            disabled={isPending}
          >
            <option value="">Все время</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
