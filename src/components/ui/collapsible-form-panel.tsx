"use client";

import { useState, type ReactNode } from "react";

export function CollapsibleFormPanel({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`panel collapsible-form-panel ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="collapsible-form-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <span className="collapsible-form-chevron" aria-hidden>
          {open ? "▾" : "▸"}
        </span>
        <span className="font-[family-name:var(--font-display)] text-lg">{title}</span>
        <span className="collapsible-form-state">{open ? "Скрыть" : "Показать"}</span>
      </button>

      {open ? (
        <div className="collapsible-form-body space-y-3">
          {children}
          {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
