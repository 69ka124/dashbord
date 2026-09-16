"use client";

import { useState, type ReactNode } from "react";
import {
  createExpenseRecordAction,
  createIncomeRecordAction,
  deleteExpenseRecordAction,
  deleteIncomeRecordAction,
  updateExpenseRecordAction,
  updateIncomeRecordAction,
} from "@/app/actions";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { ExpenseHubRow, IncomeHubRow } from "@/modules/dashboard/service";
import {
  incomeStatusTone,
  paymentStatusTone,
  StatusPill,
} from "@/components/dashboard/kpi-spark";
import {
  ExpenseLedgerTable,
  IncomeLedgerTable,
  LedgerViewToggle,
} from "@/components/dashboard/ledger-data-table";
import { ActionForm } from "@/components/ui/action-form";
import { CollapsibleFormPanel, FormField } from "@/components/ui";
import { HighlightText, highlightNode } from "@/components/dashboard/highlight-text";

const INCOME_STATUSES = ["план", "получено", "частично", "отменено"];
const DEFAULT_INCOME_KINDS = ["услуги", "лицензия", "возмещение", "АБ", "прочее"];
const WORK_STATUSES = ["в работе", "готово", "отменено"];
const PAYMENT_STATUSES = ["не оплачено", "частично", "оплачено"];
const CATEGORIES = ["подряд", "материалы", "лицензии", "прочее"];

function HubSummaryText({
  value,
  emptyLabel,
  query,
  className,
}: {
  value: string;
  emptyLabel: string;
  query: string;
  className?: string;
}) {
  if (!value.trim()) {
    return <span className={`hub-field-empty ${className ?? ""}`}>{emptyLabel}</span>;
  }

  return (
    <span className={className}>
      <HighlightText text={value} query={query} />
    </span>
  );
}

function Detail({
  label,
  value,
  query = "",
}: {
  label: string;
  value: ReactNode;
  query?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm text-[var(--ink)] break-words">
        {value ? highlightNode(value, query) : "—"}
      </p>
    </div>
  );
}

export function DashboardIncomeSection({
  rows,
  editable,
  query = "",
  incomeKinds = DEFAULT_INCOME_KINDS,
}: {
  rows: IncomeHubRow[];
  editable: boolean;
  query?: string;
  incomeKinds?: string[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");
  const total = rows
    .filter((r) => r.status.trim().toLowerCase() !== "отменено")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl">Доходы</h2>
          <p className="text-sm text-[var(--muted)]">
            Строка: отдел · проект · сумма. Нажмите, чтобы раскрыть всё.
          </p>
        </div>
        <LedgerViewToggle view={view} onChange={setView} />
      </div>

      {editable ? (
        <CollapsibleFormPanel title="Новый доход">
          <ActionForm
            action={createIncomeRecordAction}
            successMessage="Доход добавлен"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
          <input
            className="field"
            type="date"
            name="receivedAt"
            defaultValue={toDateInputValue(new Date())}
            required
          />
          <input
            className="field"
            name="incomeKind"
            list="hub-income-kinds"
            placeholder="Вид дохода"
            required
          />
          <datalist id="hub-income-kinds">
            {incomeKinds.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
          <input className="field" name="payer" placeholder="Плательщик / подразделение" required />
          <input className="field" name="project" placeholder="Проект / основание" required />
          <input className="field" name="amount" placeholder="Сумма" defaultValue="0" required />
          <input
            className="field"
            name="status"
            list="hub-income-statuses"
            defaultValue="план"
            required
          />
          <datalist id="hub-income-statuses">
            {INCOME_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input className="field" name="source" placeholder="Источник" />
          <input
            className="field sm:col-span-2 lg:col-span-3"
            name="documents"
            placeholder="Документы / комментарии"
          />
          <button className="btn w-fit" type="submit">
            Сохранить
          </button>
        </ActionForm>
        </CollapsibleFormPanel>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 px-6 py-10 text-center text-sm text-[var(--muted)]">
          {query.trim() ? "Совпадений в доходах нет" : "Доходов за выбранный период нет"}
        </div>
      ) : view === "table" ? (
        <IncomeLedgerTable rows={rows} query={query} />
      ) : (
        <div className="hub-list">
          {rows.map((row) => {
            const open = openId === row.id;
            return (
              <div key={row.id} id={`income-row-${row.id}`} className={`hub-row ${open ? "hub-row-open" : ""}`}>
                <button
                  type="button"
                  className="hub-row-summary"
                  onClick={() => setOpenId(open ? null : row.id)}
                  aria-expanded={open}
                >
                  <span className="hub-chevron" aria-hidden>
                    {open ? "▾" : "▸"}
                  </span>
                  <span className="hub-primary min-w-0 truncate font-medium">
                    <HubSummaryText
                      value={row.payer}
                      emptyLabel="Плательщик / подразделение"
                      query={query}
                    />
                  </span>
                  <span className="hub-secondary min-w-0 truncate text-[var(--muted)]">
                    <HubSummaryText
                      value={row.project}
                      emptyLabel="Проект / основание"
                      query={query}
                    />
                  </span>
                  <span className="hub-amount tabular-nums font-medium text-[var(--positive)]">
                    {formatMoney(row.amount)}
                  </span>
                  <StatusPill tone={incomeStatusTone(row.status)}>{row.status}</StatusPill>
                </button>

                {open ? (
                  <div className="hub-row-body">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Detail label="ID дохода" value={row.incomeCode} query={query} />
                      <Detail label="Дата поступления / план" value={formatDate(row.receivedAt)} query={query} />
                      <Detail label="Год" value={row.year} query={query} />
                      <Detail label="Квартал" value={`Q${row.quarter}`} query={query} />
                      <Detail label="Вид дохода" value={row.incomeKind} query={query} />
                      <Detail label="Плательщик / подразделение" value={row.payer} query={query} />
                      <Detail label="Проект / основание" value={row.project} query={query} />
                      <Detail label="Сумма" value={formatMoney(row.amount)} query={query} />
                      <Detail label="Статус" value={row.status} query={query} />
                      <Detail label="Источник" value={row.source} query={query} />
                      <Detail label="Документы / комментарии" value={row.documents} query={query} />
                    </div>

                    {editable ? (
                      <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 lg:grid-cols-[1fr_auto]">
                        <ActionForm
                          action={updateIncomeRecordAction}
                          successMessage="Доход обновлён"
                          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <FormField
                            label="Дата поступления / план"
                            name="receivedAt"
                            type="date"
                            defaultValue={toDateInputValue(row.receivedAt)}
                            required
                          />
                          <FormField
                            label="Вид дохода"
                            name="incomeKind"
                            list="hub-income-kinds"
                            defaultValue={row.incomeKind}
                            required
                          />
                          <FormField
                            label="Плательщик / подразделение"
                            name="payer"
                            defaultValue={row.payer}
                            required
                          />
                          <FormField
                            label="Проект / основание"
                            name="project"
                            defaultValue={row.project}
                            required
                          />
                          <FormField
                            label="Сумма"
                            name="amount"
                            defaultValue={row.amount}
                            required
                          />
                          <FormField
                            label="Статус"
                            name="status"
                            list="hub-income-statuses"
                            defaultValue={row.status}
                            required
                          />
                          <FormField
                            label="Источник"
                            name="source"
                            defaultValue={row.source ?? ""}
                          />
                          <FormField
                            label="Документы / комментарии"
                            name="documents"
                            wrapperClassName="sm:col-span-2"
                            defaultValue={row.documents ?? ""}
                          />
                          <div className="self-end">
                            <button className="btn btn-inline w-fit" type="submit">
                              Сохранить изменения
                            </button>
                          </div>
                        </ActionForm>
                        <ActionForm
                          action={deleteIncomeRecordAction}
                          successMessage="Доход удалён"
                          confirmMessage="Удалить эту запись о доходе?"
                          className="self-end"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <button className="btn-danger btn-inline" type="submit">
                            Удалить
                          </button>
                        </ActionForm>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="hub-footer">
          <span className="text-[var(--muted)]">Записей: {rows.length}</span>
          <span className="tabular-nums font-medium text-[var(--accent)]">
            Итого доходов: {formatMoney(total)}
          </span>
        </div>
      ) : null}
    </section>
  );
}

export function DashboardExpenseSection({
  rows,
  editable,
  query = "",
  categoryPresets = CATEGORIES,
}: {
  rows: ExpenseHubRow[];
  editable: boolean;
  query?: string;
  categoryPresets?: string[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"cards" | "table">("cards");
  const total = rows.reduce((s, r) => s + r.totalToPay, 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl">Расходы</h2>
          <p className="text-sm text-[var(--muted)]">
            Строка: контрагент · работа · сумма. Нажмите, чтобы раскрыть всё.
          </p>
        </div>
        <LedgerViewToggle view={view} onChange={setView} />
      </div>

      {editable ? (
        <CollapsibleFormPanel title="Новый расход">
          <ActionForm
            action={createExpenseRecordAction}
            successMessage="Расход добавлен"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
          <input className="field" name="recipient" placeholder="Получатель / К/А" required />
          <input className="field" name="task" placeholder="Задача / услуга" required />
          <input className="field" name="project" placeholder="Проект" required />
          <input
            className="field"
            name="category"
            list="hub-expense-categories"
            placeholder="Категория / тип услуги"
            required
          />
          <datalist id="hub-expense-categories">
            {categoryPresets.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input
            className="field"
            type="date"
            name="registeredAt"
            defaultValue={toDateInputValue(new Date())}
            required
          />
          <input
            className="field"
            name="workStatus"
            list="hub-expense-work"
            defaultValue="в работе"
            required
          />
          <datalist id="hub-expense-work">
            {WORK_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input
            className="field"
            name="paymentStatus"
            list="hub-expense-pay"
            defaultValue="не оплачено"
            required
          />
          <datalist id="hub-expense-pay">
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <input className="field" name="amount" placeholder="Сумма" defaultValue="0" required />
          <input
            className="field"
            name="totalToPay"
            placeholder="Итого к оплате"
            defaultValue="0"
            required
          />
          <input className="field" name="plannedPayQuarter" placeholder="План. квартал оплаты" />
          <input className="field" type="date" name="paidAt" />
          <input className="field" name="materialUrl" placeholder="Ссылка на материал" />
          <input className="field" name="jiraUrl" placeholder="Ссылка на Jira" />
          <input className="field" name="documents" placeholder="Документы" />
          <input
            className="field sm:col-span-2 lg:col-span-2"
            name="comment"
            placeholder="Комментарий"
          />
          <button className="btn w-fit" type="submit">
            Сохранить
          </button>
        </ActionForm>
        </CollapsibleFormPanel>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface)]/60 px-6 py-10 text-center text-sm text-[var(--muted)]">
          {query.trim() ? "Совпадений в расходах нет" : "Расходов за выбранный период нет"}
        </div>
      ) : view === "table" ? (
        <ExpenseLedgerTable rows={rows} query={query} />
      ) : (
        <div className="hub-list">
          {rows.map((row) => {
            const open = openId === row.id;
            return (
              <div key={row.id} id={`expense-row-${row.id}`} className={`hub-row ${open ? "hub-row-open" : ""}`}>
                <button
                  type="button"
                  className="hub-row-summary"
                  onClick={() => setOpenId(open ? null : row.id)}
                  aria-expanded={open}
                >
                  <span className="hub-chevron" aria-hidden>
                    {open ? "▾" : "▸"}
                  </span>
                  <span className="hub-primary min-w-0 truncate font-medium">
                    <HubSummaryText
                      value={row.recipient}
                      emptyLabel="Получатель / К/А"
                      query={query}
                    />
                  </span>
                  <span className="hub-secondary min-w-0 truncate text-[var(--muted)]">
                    <HubSummaryText value={row.task} emptyLabel="Задача / услуга" query={query} />
                  </span>
                  <span className="hub-amount tabular-nums font-medium text-[var(--negative)]">
                    {formatMoney(row.totalToPay)}
                  </span>
                  <StatusPill tone={paymentStatusTone(row.paymentStatus)}>
                    {row.paymentStatus}
                  </StatusPill>
                </button>

                {open ? (
                  <div className="hub-row-body">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Detail label="ID расхода" value={row.expenseCode} query={query} />
                      <Detail label="Получатель / К/А" value={row.recipient} query={query} />
                      <Detail label="Задача / услуга" value={row.task} query={query} />
                      <Detail label="Проект" value={row.project} query={query} />
                      <Detail label="Категория" value={row.category} query={query} />
                      <Detail label="Дата регистрации" value={formatDate(row.registeredAt)} query={query} />
                      <Detail label="Год" value={row.year} query={query} />
                      <Detail label="Квартал" value={`Q${row.quarter}`} query={query} />
                      <Detail label="Статус работы" value={row.workStatus} query={query} />
                      <Detail label="Статус оплаты" value={row.paymentStatus} query={query} />
                      <Detail label="Сумма" value={formatMoney(row.amount)} query={query} />
                      <Detail label="Итого к оплате" value={formatMoney(row.totalToPay)} query={query} />
                      <Detail
                        label="Плановый квартал оплаты"
                        value={row.plannedPayQuarter ? `Q${row.plannedPayQuarter}` : "—"}
                        query={query}
                      />
                      <Detail label="Дата оплаты" value={formatDate(row.paidAt)} query={query} />
                      <Detail
                        label="Факт. квартал оплаты"
                        value={row.actualPayQuarter ? `Q${row.actualPayQuarter}` : "—"}
                        query={query}
                      />
                      <Detail
                        label="Ссылка на материал"
                        value={
                          row.materialUrl ? (
                            <a
                              href={row.materialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--accent)] underline-offset-2 hover:underline"
                            >
                              <HighlightText text="открыть" query={query} />
                            </a>
                          ) : (
                            "—"
                          )
                        }
                        query={query}
                      />
                      <Detail label="Документы / Jira" value={row.documents} query={query} />
                      <Detail label="Комментарий" value={row.comment} query={query} />
                    </div>

                    {editable ? (
                      <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 lg:grid-cols-[1fr_auto]">
                        <ActionForm
                          action={updateExpenseRecordAction}
                          successMessage="Расход обновлён"
                          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <FormField
                            label="Получатель / К/А"
                            name="recipient"
                            defaultValue={row.recipient}
                            required
                          />
                          <FormField
                            label="Задача / услуга"
                            name="task"
                            defaultValue={row.task}
                            required
                          />
                          <FormField
                            label="Проект"
                            name="project"
                            defaultValue={row.project}
                            required
                          />
                          <FormField
                            label="Категория"
                            name="category"
                            list="hub-expense-categories"
                            defaultValue={row.category}
                            required
                          />
                          <FormField
                            label="Дата регистрации"
                            name="registeredAt"
                            type="date"
                            defaultValue={toDateInputValue(row.registeredAt)}
                            required
                          />
                          <FormField
                            label="Статус работы"
                            name="workStatus"
                            list="hub-expense-work"
                            defaultValue={row.workStatus}
                            required
                          />
                          <FormField
                            label="Статус оплаты"
                            name="paymentStatus"
                            list="hub-expense-pay"
                            defaultValue={row.paymentStatus}
                            required
                          />
                          <FormField
                            label="Сумма"
                            name="amount"
                            defaultValue={row.amount}
                            required
                          />
                          <FormField
                            label="Итого к оплате"
                            name="totalToPay"
                            defaultValue={row.totalToPay}
                            required
                          />
                          <FormField
                            label="Плановый квартал оплаты"
                            name="plannedPayQuarter"
                            defaultValue={row.plannedPayQuarter ?? ""}
                          />
                          <FormField
                            label="Дата оплаты"
                            name="paidAt"
                            type="date"
                            defaultValue={toDateInputValue(row.paidAt)}
                          />
                          <FormField
                            label="Ссылка на материал"
                            name="materialUrl"
                            defaultValue={row.materialUrl ?? ""}
                          />
                          <FormField
                            label="Документы / Jira"
                            name="documents"
                            defaultValue={row.documents ?? ""}
                          />
                          <FormField
                            label="Комментарий"
                            name="comment"
                            wrapperClassName="sm:col-span-2"
                            defaultValue={row.comment ?? ""}
                          />
                          <div className="self-end">
                            <button className="btn btn-inline w-fit" type="submit">
                              Сохранить изменения
                            </button>
                          </div>
                        </ActionForm>
                        <ActionForm
                          action={deleteExpenseRecordAction}
                          successMessage="Расход удалён"
                          confirmMessage="Удалить эту запись о расходе?"
                          className="self-end"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <button className="btn-danger btn-inline" type="submit">
                            Удалить
                          </button>
                        </ActionForm>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="hub-footer">
          <span className="text-[var(--muted)]">Записей: {rows.length}</span>
          <span className="tabular-nums font-medium text-[var(--negative)]">
            Итого расходов: {formatMoney(total)}
          </span>
        </div>
      ) : null}
    </section>
  );
}
