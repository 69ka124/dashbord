"use client";

import { Fragment, useState, type ReactNode } from "react";
import {
  createExpenseRecordAction,
  deleteExpenseRecordAction,
  updateExpenseRecordAction,
} from "@/app/actions";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { paymentStatusTone, StatusPill } from "@/components/dashboard/kpi-spark";
import { ActionForm } from "@/components/ui/action-form";
import { CollapsibleFormPanel, FormField } from "@/components/ui";

const WORK_STATUSES = ["в работе", "готово", "отменено"];
const PAYMENT_STATUSES = ["не оплачено", "частично", "оплачено"];

export type ExpenseTableRow = {
  id: string;
  expenseCode: string;
  recipient: string;
  task: string;
  project: string;
  category: string;
  registeredAt: string;
  year: number;
  quarter: number;
  workStatus: string;
  paymentStatus: string;
  amount: number;
  totalToPay: number;
  plannedPayQuarter: number | null;
  paidAt: string | null;
  actualPayQuarter: number | null;
  materialUrl: string | null;
  jiraUrl: string | null;
  documents: string | null;
  comment: string | null;
};

function workStatusTone(status: string): "ok" | "warn" | "bad" | "muted" {
  const s = status.trim().toLowerCase();
  if (s === "готово") return "ok";
  if (s === "в работе") return "warn";
  if (s === "отменено") return "bad";
  return "muted";
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 break-words text-sm text-[var(--ink)]">{value || "—"}</p>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <>—</>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="break-all text-[var(--accent)] underline-offset-2 hover:underline"
    >
      {label}
    </a>
  );
}

function ExpenseDatalists({ categoryPresets }: { categoryPresets: string[] }) {
  return (
    <>
      <datalist id="expense-categories">
        {categoryPresets.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id="expense-work-statuses">
        {WORK_STATUSES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <datalist id="expense-payment-statuses">
        {PAYMENT_STATUSES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}

function QuarterSelect({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
}) {
  return (
    <label className="form-field">
      <span className="form-field-label">{label}</span>
      <select
        className="field"
        name={name}
        defaultValue={defaultValue ?? ""}
        aria-label={label}
      >
        <option value="">Не указан</option>
        {[1, 2, 3, 4].map((q) => (
          <option key={q} value={q}>
            Q{q}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Общие поля формы расхода (создание и редактирование). */
function ExpenseFields({ row }: { row?: ExpenseTableRow }) {
  return (
    <>
      <FormField
        label="Получатель / К/А"
        name="recipient"
        defaultValue={row?.recipient ?? ""}
        required
      />
      <FormField label="Задача / услуга" name="task" defaultValue={row?.task ?? ""} required />
      <FormField label="Проект" name="project" defaultValue={row?.project ?? ""} required />
      <FormField
        label="Категория расхода"
        name="category"
        list="expense-categories"
        defaultValue={row?.category ?? ""}
        required
      />
      <FormField
        label="Дата регистрации"
        name="registeredAt"
        type="date"
        defaultValue={row ? toDateInputValue(row.registeredAt) : toDateInputValue(new Date())}
        required
      />
      <FormField
        label="Статус работы"
        name="workStatus"
        list="expense-work-statuses"
        defaultValue={row?.workStatus ?? "в работе"}
        required
      />
      <FormField
        label="Статус оплаты"
        name="paymentStatus"
        list="expense-payment-statuses"
        defaultValue={row?.paymentStatus ?? "не оплачено"}
        required
      />
      <FormField label="Сумма" name="amount" defaultValue={row?.amount ?? 0} required />
      <FormField
        label="Итого к оплате"
        name="totalToPay"
        defaultValue={row?.totalToPay ?? 0}
        required
      />
      <QuarterSelect
        name="plannedPayQuarter"
        label="Плановый квартал оплаты"
        defaultValue={row?.plannedPayQuarter ?? null}
      />
      <FormField
        label="Дата оплаты"
        name="paidAt"
        type="date"
        defaultValue={row ? toDateInputValue(row.paidAt) : ""}
      />
      <FormField
        label="Ссылка на материал"
        name="materialUrl"
        defaultValue={row?.materialUrl ?? ""}
        placeholder="https://…"
      />
      <FormField
        label="Ссылка на Jira"
        name="jiraUrl"
        defaultValue={row?.jiraUrl ?? ""}
        placeholder="https://…"
      />
      <FormField label="Документы" name="documents" defaultValue={row?.documents ?? ""} />
      <FormField
        label="Комментарий"
        name="comment"
        wrapperClassName="sm:col-span-2 lg:col-span-2"
        defaultValue={row?.comment ?? ""}
      />
    </>
  );
}

export function ExpenseCreatePanel({ categoryPresets }: { categoryPresets: string[] }) {
  return (
    <CollapsibleFormPanel title="Новый расход">
      <ExpenseDatalists categoryPresets={categoryPresets} />
      <ActionForm
        action={createExpenseRecordAction}
        successMessage="Расход добавлен"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <ExpenseFields />
        <div className="flex items-end sm:col-span-2 lg:col-span-2">
          <button className="btn" type="submit">
            Добавить расход
          </button>
        </div>
      </ActionForm>
    </CollapsibleFormPanel>
  );
}

/**
 * Таблица расходов. Datalist'ы для полей редактирования рендерит
 * ExpenseCreatePanel (показывается только в режиме редактирования).
 */
export function ExpenseTable({
  rows,
  editable,
}: {
  rows: ExpenseTableRow[];
  editable: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const total = rows
    .filter((r) => r.workStatus.trim().toLowerCase() !== "отменено")
    .reduce((sum, row) => sum + row.totalToPay, 0);
  const colCount = 10;

  return (
    <section className="space-y-3">
      <div className="table-wrap">
        <table className="data expense-grid">
          <thead>
            <tr>
              <th className="w-9" aria-label="Раскрыть" />
              <th className="w-16">ID</th>
              <th>Получатель / К/А</th>
              <th>Задача / услуга</th>
              <th className="hidden xl:table-cell">Проект</th>
              <th className="hidden w-32 lg:table-cell">Категория</th>
              <th className="hidden w-24 md:table-cell">Дата</th>
              <th className="hidden w-28 md:table-cell">Работа</th>
              <th className="w-32">Оплата</th>
              <th className="w-32 text-right">К оплате</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const open = openId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr
                    id={`expense-row-${row.id}`}
                    className={`expense-row ${open ? "is-open" : ""}`}
                    onClick={() => setOpenId(open ? null : row.id)}
                  >
                    <td className="expense-chevron">
                      <button
                        type="button"
                        className="expense-chevron-btn"
                        aria-expanded={open}
                        aria-label={open ? "Свернуть" : "Раскрыть"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(open ? null : row.id);
                        }}
                      >
                        {open ? "▾" : "▸"}
                      </button>
                    </td>
                    <td className="font-medium tabular-nums">{row.expenseCode}</td>
                    <td className="font-medium" title={row.recipient}>
                      {row.recipient || "—"}
                    </td>
                    <td title={row.task}>{row.task || "—"}</td>
                    <td className="hidden xl:table-cell" title={row.project}>
                      {row.project || "—"}
                    </td>
                    <td className="hidden lg:table-cell" title={row.category}>
                      {row.category || "—"}
                    </td>
                    <td className="hidden md:table-cell tabular-nums">
                      {formatDate(row.registeredAt)}
                    </td>
                    <td className="hidden md:table-cell">
                      <StatusPill tone={workStatusTone(row.workStatus)}>{row.workStatus}</StatusPill>
                    </td>
                    <td>
                      <StatusPill tone={paymentStatusTone(row.paymentStatus)}>
                        {row.paymentStatus}
                      </StatusPill>
                    </td>
                    <td className="text-right tabular-nums font-medium text-[var(--negative)]">
                      {formatMoney(row.totalToPay)}
                    </td>
                  </tr>

                  {open ? (
                    <tr className="expense-detail">
                      <td colSpan={colCount}>
                        <div className="expense-detail-body">
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <Detail label="ID расхода" value={row.expenseCode} />
                            <Detail label="Получатель / К/А" value={row.recipient} />
                            <Detail label="Задача / услуга" value={row.task} />
                            <Detail label="Проект" value={row.project} />
                            <Detail label="Категория расхода" value={row.category} />
                            <Detail
                              label="Дата регистрации"
                              value={`${formatDate(row.registeredAt)} · ${row.year}, Q${row.quarter}`}
                            />
                            <Detail label="Статус работы" value={row.workStatus} />
                            <Detail label="Статус оплаты" value={row.paymentStatus} />
                            <Detail label="Сумма" value={formatMoney(row.amount)} />
                            <Detail label="Итого к оплате" value={formatMoney(row.totalToPay)} />
                            <Detail
                              label="Плановый квартал оплаты"
                              value={row.plannedPayQuarter ? `Q${row.plannedPayQuarter}` : "—"}
                            />
                            <Detail
                              label="Дата оплаты"
                              value={
                                row.paidAt
                                  ? `${formatDate(row.paidAt)}${row.actualPayQuarter ? ` · Q${row.actualPayQuarter}` : ""}`
                                  : "—"
                              }
                            />
                            <Detail
                              label="Ссылка на материал"
                              value={<ExternalLink href={row.materialUrl} label="открыть материал" />}
                            />
                            <Detail
                              label="Jira"
                              value={<ExternalLink href={row.jiraUrl} label={row.jiraUrl ?? ""} />}
                            />
                            <Detail label="Документы" value={row.documents} />
                            <Detail label="Комментарий" value={row.comment} />
                          </div>

                          {editable ? (
                            <div className="mt-4 border-t border-[var(--line)] pt-4">
                              <p className="mb-3 text-sm font-medium text-[var(--ink)]">
                                Редактировать расход {row.expenseCode}
                              </p>
                              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                                <ActionForm
                                  action={updateExpenseRecordAction}
                                  successMessage="Расход обновлён"
                                  className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                                >
                                  <input type="hidden" name="id" value={row.id} />
                                  <ExpenseFields row={row} />
                                  <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-2">
                                    <button className="btn" type="submit">
                                      Сохранить изменения
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-ghost"
                                      onClick={() => setOpenId(null)}
                                    >
                                      Свернуть
                                    </button>
                                  </div>
                                </ActionForm>
                                <ActionForm
                                  action={deleteExpenseRecordAction}
                                  successMessage="Расход удалён"
                                  confirmMessage={`Удалить расход ${row.expenseCode}?`}
                                  className="self-end"
                                  onSuccess={() => setOpenId(null)}
                                >
                                  <input type="hidden" name="id" value={row.id} />
                                  <button className="btn-danger" type="submit">
                                    Удалить
                                  </button>
                                </ActionForm>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="hub-footer">
        <span className="text-[var(--muted)]">Записей: {rows.length}</span>
        <span className="tabular-nums font-medium text-[var(--negative)]">
          Итого к оплате (без отменённых): {formatMoney(total)}
        </span>
      </div>
    </section>
  );
}
