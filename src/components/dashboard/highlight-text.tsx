"use client";

import { Fragment, type ReactNode } from "react";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function HighlightText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const needle = query.trim();
  if (!needle) return <span className={className}>{text}</span>;

  const parts = text.split(new RegExp(`(${escapeRegExp(needle)})`, "gi"));
  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark key={`${part}-${index}`} className="search-hit">
            {part}
          </mark>
        ) : (
          <Fragment key={`${part}-${index}`}>{part}</Fragment>
        ),
      )}
    </span>
  );
}

export function highlightNode(value: ReactNode, query: string): ReactNode {
  if (!query.trim()) return value;
  if (typeof value === "string" || typeof value === "number") {
    return <HighlightText text={String(value)} query={query} />;
  }
  return value;
}
