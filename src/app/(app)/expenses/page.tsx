import { canEdit, requireAccess } from "@/lib/access";
import { listCategoryPresets } from "@/lib/presets";
import { listExpenseRecords } from "@/modules/expense/service";
import { ExpenseCreatePanel, ExpenseTable } from "@/components/expenses/expense-table";
import { EmptyState, PageHeader } from "@/components/ui";

const WORK_STATUSES = ["в работе", "готово", "отменено"];
const PAYMENT_STATUSES = ["не оплачено", "частично", "оплачено"];

export default async function ExpensePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    workStatus?: string;
    paymentStatus?: string;
    category?: string;
    year?: string;
    quarter?: string;
  }>;
}) {
  const access = await requireAccess("view");
  const editable = canEdit(access);
  const params = await searchParams;
  const currentYear = new Date().getFullYear();

  const [rows, categoryPresets] = await Promise.all([
    listExpenseRecords({
      q: params.q,
      workStatus: params.workStatus || undefined,
      paymentStatus: params.paymentStatus || undefined,
      category: params.category || undefined,
      year: params.year ? Number(params.year) : undefined,
      quarter: params.quarter ? Number(params.quarter) : undefined,
    }),
    listCategoryPresets(),
  ]);

  const tableRows = rows.map((row) => ({
    id: row.id,
    expenseCode: row.expenseCode,
    recipient: row.recipient,
    task: row.task,
    project: row.project,
    category: row.category,
    registeredAt: row.registeredAt.toISOString(),
    year: row.year,
    quarter: row.quarter,
    workStatus: row.workStatus,
    paymentStatus: row.paymentStatus,
    amount: row.amount,
    totalToPay: row.totalToPay,
    plannedPayQuarter: row.plannedPayQuarter,
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    actualPayQuarter: row.actualPayQuarter,
    materialUrl: row.materialUrl,
    jiraUrl: row.jiraUrl,
    documents: row.documents,
    comment: row.comment,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Расходы"
        description="Нажмите на строку, чтобы увидеть все поля и отредактировать запись."
      />

      <form className="panel grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input
          className="field lg:col-span-2"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Поиск: ID, к/а, задача, проект"
        />
        <select className="field" name="workStatus" defaultValue={params.workStatus ?? ""}>
          <option value="">Статус работы</option>
          {WORK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="field" name="paymentStatus" defaultValue={params.paymentStatus ?? ""}>
          <option value="">Статус оплаты</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="field" name="category" defaultValue={params.category ?? ""}>
          <option value="">Категория</option>
          {categoryPresets.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="field" name="year" defaultValue={params.year ?? ""}>
          <option value="">Год</option>
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select className="field" name="quarter" defaultValue={params.quarter ?? ""}>
          <option value="">Квартал</option>
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              Q{q}
            </option>
          ))}
        </select>
        <div className="flex gap-2 lg:col-span-5">
          <button className="btn w-fit" type="submit">
            Применить
          </button>
          <a className="btn-ghost w-fit" href="/expenses">
            Сбросить
          </a>
        </div>
      </form>

      {editable ? <ExpenseCreatePanel categoryPresets={categoryPresets} /> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Расходов не найдено"
          hint={
            editable
              ? "Измените фильтры или добавьте первую запись о расходе."
              : "Измените фильтры."
          }
        />
      ) : (
        <ExpenseTable rows={tableRows} editable={editable} />
      )}
    </div>
  );
}
