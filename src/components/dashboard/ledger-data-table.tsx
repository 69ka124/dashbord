"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { ExpenseHubRow, IncomeHubRow } from "@/modules/dashboard/service";
import {
  incomeStatusTone,
  paymentStatusTone,
  StatusPill,
} from "@/components/dashboard/kpi-spark";
import { HighlightText } from "@/components/dashboard/highlight-text";

const sortableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const incomeHelper = createColumnHelper<typeof sortableFeatures, IncomeHubRow>();
const expenseHelper = createColumnHelper<typeof sortableFeatures, ExpenseHubRow>();

function SortHeader({
  label,
  sorted,
  onClick,
}: {
  label: string;
  sorted: false | "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button type="button" className="ledger-sort-btn" onClick={onClick}>
      {label}
      <span className="ledger-sort-icon" aria-hidden>
        {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
      </span>
    </button>
  );
}

function filterRows<T extends Record<string, unknown>>(rows: T[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((row) =>
    Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(q)),
  );
}

export function IncomeLedgerTable({ rows, query = "" }: { rows: IncomeHubRow[]; query?: string }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "receivedAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const filteredRows = useMemo(() => filterRows(rows, globalFilter), [rows, globalFilter]);

  const helper = incomeHelper;
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("receivedAt", {
          header: ({ column }) => (
            <SortHeader
              label="Дата"
              sorted={column.getIsSorted() || false}
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
          ),
          cell: ({ getValue }) => formatDate(String(getValue())),
        }),
        helper.accessor("payer", {
          header: "Плательщик",
          cell: ({ getValue }) => (
            <HighlightText text={String(getValue() || "—")} query={query} />
          ),
        }),
        helper.accessor("project", {
          header: "Проект",
          cell: ({ getValue }) => (
            <HighlightText text={String(getValue() || "—")} query={query} />
          ),
        }),
        helper.accessor("amount", {
          header: ({ column }) => (
            <SortHeader
              label="Сумма"
              sorted={column.getIsSorted() || false}
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
          ),
          cell: ({ getValue }) => (
            <span className="tabular-nums text-[var(--positive)]">{formatMoney(Number(getValue()))}</span>
          ),
        }),
        helper.accessor("status", {
          header: "Статус",
          cell: ({ getValue }) => (
            <StatusPill tone={incomeStatusTone(String(getValue()))}>{String(getValue())}</StatusPill>
          ),
        }),
      ]),
    [query],
  );

  const table = useTable({
    features: sortableFeatures,
    columns,
    data: filteredRows,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className="ledger-table-wrap">
      <input
        className="field ledger-table-filter"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Фильтр таблицы…"
      />
      <div className="table-wrap">
        <table className="data ledger-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-[var(--muted)]">
                  Нет строк
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExpenseLedgerTable({ rows, query = "" }: { rows: ExpenseHubRow[]; query?: string }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "registeredAt", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const filteredRows = useMemo(() => filterRows(rows, globalFilter), [rows, globalFilter]);

  const helper = expenseHelper;
  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor("registeredAt", {
          header: ({ column }) => (
            <SortHeader
              label="Дата"
              sorted={column.getIsSorted() || false}
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
          ),
          cell: ({ getValue }) => formatDate(String(getValue())),
        }),
        helper.accessor("recipient", {
          header: "К/А",
          cell: ({ getValue }) => (
            <HighlightText text={String(getValue() || "—")} query={query} />
          ),
        }),
        helper.accessor("task", {
          header: "Задача",
          cell: ({ getValue }) => (
            <HighlightText text={String(getValue() || "—")} query={query} />
          ),
        }),
        helper.accessor("totalToPay", {
          header: ({ column }) => (
            <SortHeader
              label="К оплате"
              sorted={column.getIsSorted() || false}
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            />
          ),
          cell: ({ getValue }) => (
            <span className="tabular-nums text-[var(--negative)]">{formatMoney(Number(getValue()))}</span>
          ),
        }),
        helper.accessor("paymentStatus", {
          header: "Оплата",
          cell: ({ getValue }) => (
            <StatusPill tone={paymentStatusTone(String(getValue()))}>{String(getValue())}</StatusPill>
          ),
        }),
      ]),
    [query],
  );

  const table = useTable({
    features: sortableFeatures,
    columns,
    data: filteredRows,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className="ledger-table-wrap">
      <input
        className="field ledger-table-filter"
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        placeholder="Фильтр таблицы…"
      />
      <div className="table-wrap">
        <table className="data ledger-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center text-[var(--muted)]">
                  Нет строк
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LedgerViewToggle({
  view,
  onChange,
}: {
  view: "cards" | "table";
  onChange: (view: "cards" | "table") => void;
}) {
  return (
    <div className="ledger-view-toggle" role="group" aria-label="Вид списка">
      <button
        type="button"
        className={view === "cards" ? "ledger-view-btn active" : "ledger-view-btn"}
        onClick={() => onChange("cards")}
      >
        Карточки
      </button>
      <button
        type="button"
        className={view === "table" ? "ledger-view-btn active" : "ledger-view-btn"}
        onClick={() => onChange("table")}
      >
        Таблица
      </button>
    </div>
  );
}
