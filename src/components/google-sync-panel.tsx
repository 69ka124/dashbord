"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { importGoogleSpreadsheetAction } from "@/app/actions";

function formatSummary(summary: {
  income: number;
  expense: number;
  counterparty: number;
  purchase: number;
  archivedSheets: number;
  archivedRows: number;
  extraSheets: string[];
}) {
  const extra = summary.extraSheets.length ? `; ещё: ${summary.extraSheets.join(", ")}` : "";
  return `в дашборд — доходы ${summary.income}, расходы ${summary.expense}, к/а ${summary.counterparty}, закупки ${summary.purchase}. Архив: ${summary.archivedSheets} листов, ${summary.archivedRows} строк${extra}`;
}

export function GoogleSyncPanel({
  spreadsheetUrl,
  lastPullAt,
  lastError,
  lastArchive,
}: {
  spreadsheetUrl: string;
  lastPullAt?: string | null;
  lastError?: string | null;
  lastArchive?: {
    createdAt: string;
    sheetCount: number;
    rowCount: number;
    extraSheets: string | null;
  } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <section className="panel space-y-4">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-lg">Google Таблица</h2>
        <p className="text-sm text-[var(--muted)]">
          Забирает всю таблицу в архив (все листы и ячейки) и раскладывает известные вкладки в
          дашборд. Обратно ничего не пишется. Для переноса без Google-входа откройте доступ
          «все, у кого есть ссылка» на просмотр.
        </p>
        {lastPullAt ? <p className="text-sm text-[var(--muted)]">Последний перенос: {lastPullAt}</p> : null}
        {lastArchive ? (
          <p className="text-sm text-[var(--muted)]">
            Архив: {lastArchive.sheetCount} листов, {lastArchive.rowCount} строк
            {lastArchive.extraSheets ? ` · ${lastArchive.extraSheets}` : ""}.
          </p>
        ) : null}
        {lastError ? <p className="text-sm text-[var(--danger)]">{lastError}</p> : null}
      </div>

      <form
        className="grid gap-3 lg:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const id = toast.loading("Сбор таблицы и перенос…");
            try {
              const result = await importGoogleSpreadsheetAction(formData);
              if (!result.ok) {
                toast.error(result.message);
                return;
              }
              router.refresh();
              toast.success(`Перенесено: ${formatSummary(result.value)}`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Не удалось перенести данные");
            } finally {
              toast.dismiss(id);
            }
          });
        }}
      >
        <input
          className="field"
          name="spreadsheet"
          defaultValue={spreadsheetUrl}
          placeholder="https://docs.google.com/spreadsheets/d/…"
          disabled={pending}
        />
        <button className="btn" type="submit" disabled={pending}>
          Перенести в дашборд
        </button>
      </form>

      {spreadsheetUrl ? (
        <a className="text-sm text-[var(--accent)] underline-offset-2 hover:underline" href={spreadsheetUrl} target="_blank" rel="noreferrer">
          Открыть таблицу
        </a>
      ) : null}

      <p className="text-xs text-[var(--muted)]">
        В дашборд идут «Доходы», «Расходы», «К/А», «Закупки». Остальные листы и лишние колонки
        сохраняются в архив для будущего переноса.
      </p>
    </section>
  );
}
