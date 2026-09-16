"use client";

import { useEffect, useState } from "react";
import type { GlobalSearchResult } from "@/lib/global-search";
import { HighlightText } from "@/components/dashboard/highlight-text";

type GlobalSearchPanelProps = {
  query: string;
  year?: number;
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  emptyHint?: string;
};

export function GlobalSearchPanel({
  query,
  year,
  open,
  onClose,
  onNavigate,
  emptyHint = "Попробуйте другое слово или проверьте год.",
}: GlobalSearchPanelProps) {
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    const needle = query.trim();
    if (!open || needle.length < 1) {
      setResult(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({ q: needle });
    if (year) params.set("year", String(year));

    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: GlobalSearchResult) => setResult(data))
      .catch(() => {
        if (!controller.signal.aborted) setResult(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, year, open]);

  if (!open || !query.trim()) return null;

  const preview = result ?? { query: query.trim(), total: 0, sections: [] };

  return (
    <div
      id="global-search-panel"
      className="search-panel"
      role="dialog"
      aria-label="Результаты поиска"
    >
      <div className="search-panel-head">
        <p className="search-panel-query">
          Поиск: «<HighlightText text={preview.query} query={preview.query} />»
        </p>
        <p className="search-panel-meta">
          {loading
            ? "Ищем по всем разделам…"
            : preview.total > 0
              ? `${preview.total} совпадений в ${preview.sections.length} разделах`
              : "Ничего не найдено"}
        </p>
      </div>

      {!loading && preview.sections.length === 0 ? (
        <p className="search-panel-empty">{emptyHint}</p>
      ) : (
        <ul className="search-panel-sections">
          {preview.sections.map((section) => (
            <li key={section.id} className="search-panel-section">
              <button
                type="button"
                className="search-panel-section-head"
                onClick={() => onNavigate(section.href)}
              >
                <span className="search-panel-section-label">{section.label}</span>
                <span className="search-panel-section-count">{section.count}</span>
              </button>
              <ul className="search-panel-hits">
                {section.hits.map((hit) => (
                  <li key={`${section.id}-${hit.id}`}>
                    <button
                      type="button"
                      className="search-panel-hit"
                      onClick={() => onNavigate(hit.href)}
                    >
                      <span className="search-panel-hit-title">
                        <HighlightText text={hit.title} query={preview.query} />
                      </span>
                      {hit.subtitle ? (
                        <span className="search-panel-hit-sub">
                          <HighlightText text={hit.subtitle} query={preview.query} />
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
                {section.count > section.hits.length ? (
                  <li className="search-panel-more">
                    <button
                      type="button"
                      className="search-panel-hit search-panel-hit-more"
                      onClick={() => onNavigate(section.href)}
                    >
                      Ещё {section.count - section.hits.length} в разделе «{section.label}»
                    </button>
                  </li>
                ) : null}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
