import {
  createIncomeRecordAction,
  deleteIncomeRecordAction,
  updateIncomeRecordAction,
} from "@/app/actions";
import { canEdit, requireAccess } from "@/lib/access";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listIncomeKindPresets } from "@/lib/presets";
import { listIncomeRecords } from "@/modules/income/service";
import { CollapsibleFormPanel, EmptyState, PageHeader } from "@/components/ui";

const STATUSES = ["план", "получено", "частично", "отменено"];

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    incomeKind?: string;
    year?: string;
    quarter?: string;
  }>;
}) {
  const access = await requireAccess("view");
  const editable = canEdit(access);
  const params = await searchParams;
  const currentYear = new Date().getFullYear();

  const [rows, incomeKinds] = await Promise.all([
    listIncomeRecords({
      q: params.q,
      status: params.status || undefined,
      incomeKind: params.incomeKind || undefined,
      year: params.year ? Number(params.year) : undefined,
      quarter: params.quarter ? Number(params.quarter) : undefined,
    }),
    listIncomeKindPresets(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Доходы" description="Учёт поступлений: план и факт по источникам." />

      <form className="panel grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <input
          className="field lg:col-span-2"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Поиск: ID, плательщик, проект"
        />
        <select className="field" name="status" defaultValue={params.status ?? ""}>
          <option value="">Все статусы</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="field" name="incomeKind" defaultValue={params.incomeKind ?? ""}>
          <option value="">Все виды</option>
          {incomeKinds.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select className="field" name="year" defaultValue={params.year ?? ""}>
          <option value="">Все годы</option>
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select className="field" name="quarter" defaultValue={params.quarter ?? ""}>
          <option value="">Все кварталы</option>
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              Q{q}
            </option>
          ))}
        </select>
        <button className="btn w-fit" type="submit">
          Применить
        </button>
      </form>

      {editable ? (
        <CollapsibleFormPanel title="Новый доход">
          <form action={createIncomeRecordAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="field"
              type="date"
              name="receivedAt"
              defaultValue={toDateInputValue(new Date())}
              required
              title="Дата поступления / план"
            />
            <input
              className="field"
              name="incomeKind"
              list="income-kinds"
              placeholder="Вид дохода"
              required
            />
            <datalist id="income-kinds">
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
              list="income-statuses"
              defaultValue="план"
              required
            />
            <datalist id="income-statuses">
              {STATUSES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <input className="field" name="source" placeholder="Источник" />
            <input
              className="field sm:col-span-2 lg:col-span-4"
              name="documents"
              placeholder="Документы / комментарии"
            />
            <button className="btn w-fit" type="submit">
              Добавить
            </button>
          </form>
        </CollapsibleFormPanel>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="Доходов пока нет" hint="Добавьте первую запись о доходе." />
      ) : (
        <div className="table-wrap">
          <table className="data income-table">
            <thead>
              <tr>
                <th>ID дохода</th>
                <th>Дата поступления / план</th>
                <th>Год</th>
                <th>Квартал</th>
                <th>Вид дохода</th>
                <th>Плательщик / подразделение</th>
                <th>Проект / основание</th>
                <th className="text-right">Сумма</th>
                <th>Статус</th>
                <th>Документы / комментарии</th>
                <th>Источник</th>
                {editable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap font-medium">{row.incomeCode}</td>
                  <td className="whitespace-nowrap">{formatDate(row.receivedAt)}</td>
                  <td>{row.year}</td>
                  <td>Q{row.quarter}</td>
                  <td>{row.incomeKind}</td>
                  <td>{row.payer}</td>
                  <td>{row.project}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {formatMoney(row.amount)}
                  </td>
                  <td>{row.status}</td>
                  <td className="max-w-[12rem] truncate" title={row.documents ?? ""}>
                    {row.documents || "—"}
                  </td>
                  <td>{row.source || "—"}</td>
                  {editable ? (
                    <td>
                      <details>
                        <summary className="cursor-pointer whitespace-nowrap text-[var(--accent)]">
                          Изменить
                        </summary>
                        <form action={updateIncomeRecordAction} className="mt-2 grid min-w-72 gap-2">
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            className="field"
                            type="date"
                            name="receivedAt"
                            defaultValue={toDateInputValue(row.receivedAt)}
                            required
                          />
                          <input
                            className="field"
                            name="incomeKind"
                            list="income-kinds"
                            defaultValue={row.incomeKind}
                            required
                          />
                          <input className="field" name="payer" defaultValue={row.payer} required />
                          <input
                            className="field"
                            name="project"
                            defaultValue={row.project}
                            required
                          />
                          <input className="field" name="amount" defaultValue={row.amount} required />
                          <input
                            className="field"
                            name="status"
                            list="income-statuses"
                            defaultValue={row.status}
                            required
                          />
                          <input
                            className="field"
                            name="documents"
                            defaultValue={row.documents ?? ""}
                          />
                          <input className="field" name="source" defaultValue={row.source ?? ""} />
                          <button className="btn" type="submit">
                            Сохранить
                          </button>
                        </form>
                        <form action={deleteIncomeRecordAction} className="mt-2">
                          <input type="hidden" name="id" value={row.id} />
                          <button className="btn-danger" type="submit">
                            Удалить
                          </button>
                        </form>
                      </details>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
