import {
  createPurchaseItemAction,
  deletePurchaseItemAction,
  updatePurchaseItemAction,
} from "@/app/actions";
import { canEdit, requireAccess } from "@/lib/access";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { listPurchaseItems } from "@/modules/purchases/service";
import { CollapsibleFormPanel, EmptyState, PageHeader } from "@/components/ui";
import { YearFilterSelect } from "@/components/ui/year-filter-select";

const TYPES = ["техника", "софт", "сайт", "подписка", "прочее"];
const SUBSCRIPTIONS = ["нет", "ежемесячная", "годовая"];
const PRIORITIES = ["высокий", "средний", "низкий"];
const STATUSES = ["план", "к оплате", "оплачено", "отменено"];

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    priority?: string;
    subscription?: string;
    year?: string;
  }>;
}) {
  const access = await requireAccess("view");
  const editable = canEdit(access);
  const params = await searchParams;
  const year = params.year ? Number(params.year) : undefined;

  const rows = await listPurchaseItems({
    q: params.q,
    type: params.type || undefined,
    status: params.status || undefined,
    priority: params.priority || undefined,
    subscription: params.subscription || undefined,
    year: Number.isFinite(year) ? year : undefined,
  });

  const total = rows.reduce((sum, row) => sum + row.lineTotal, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Закупки"
        description="Техника, сайты и подписки: суммы, приоритет и статус."
      />

      <form className="panel grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <YearFilterSelect value={Number.isFinite(year) ? year : undefined} />
        <input
          className="field lg:col-span-2"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Поиск: название, комментарий"
        />
        <select className="field" name="type" defaultValue={params.type ?? ""}>
          <option value="">Все типы</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select className="field" name="status" defaultValue={params.status ?? ""}>
          <option value="">Все статусы</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="field" name="priority" defaultValue={params.priority ?? ""}>
          <option value="">Все приоритеты</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select className="field" name="subscription" defaultValue={params.subscription ?? ""}>
          <option value="">Подписка</option>
          {SUBSCRIPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn w-fit" type="submit">
          Применить
        </button>
      </form>

      {editable ? (
        <CollapsibleFormPanel title="Новая закупка">
          <form
            action={createPurchaseItemAction}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input className="field" name="type" list="purchase-types" placeholder="Тип" required />
            <datalist id="purchase-types">
              {TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <input
              className="field lg:col-span-2"
              name="title"
              placeholder="Название техники / сайта"
              required
            />
            <input className="field" type="date" name="paymentDate" />
            <input className="field" name="unitPrice" placeholder="Сумма за ед." defaultValue="0" required />
            <input className="field" name="quantity" placeholder="Кол-во" defaultValue="1" required />
            <input className="field" name="productUrl" placeholder="Ссылка на товар / сайт" />
            <input
              className="field"
              name="subscription"
              list="purchase-subs"
              defaultValue="нет"
              placeholder="Подписка"
            />
            <datalist id="purchase-subs">
              {SUBSCRIPTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <input
              className="field"
              name="priority"
              list="purchase-priorities"
              defaultValue="средний"
            />
            <datalist id="purchase-priorities">
              {PRIORITIES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <input className="field" name="status" list="purchase-statuses" defaultValue="план" />
            <datalist id="purchase-statuses">
              {STATUSES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <input
              className="field sm:col-span-2 lg:col-span-4"
              name="comment"
              placeholder="Комментарий / таск"
            />
            <button className="btn w-fit" type="submit">
              Добавить
            </button>
          </form>
        </CollapsibleFormPanel>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="Закупок пока нет" hint="Добавьте первую позицию." />
      ) : (
        <>
          <div className="table-wrap">
            <table className="data purchases-table">
              <thead>
                <tr>
                  <th>Тип</th>
                  <th>Название техники / сайта</th>
                  <th>Комментарий / таск</th>
                  <th>Дата оплаты / списания</th>
                  <th className="text-right">Сумма за ед.</th>
                  <th className="text-right">Кол-во</th>
                  <th>Ссылка на товар / сайт</th>
                  <th>Ежемесячная / годовая подписка</th>
                  <th className="text-right">Итого по строке</th>
                  <th>Приоритет</th>
                  <th>Статус</th>
                  {editable ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} id={`purchase-${row.id}`} className="scroll-mt-28">
                    <td>{row.type}</td>
                    <td className="font-medium">{row.title}</td>
                    <td className="max-w-[12rem] truncate" title={row.comment ?? ""}>
                      {row.comment || "—"}
                    </td>
                    <td className="whitespace-nowrap">{formatDate(row.paymentDate)}</td>
                    <td className="text-right tabular-nums whitespace-nowrap">
                      {formatMoney(row.unitPrice)}
                    </td>
                    <td className="text-right tabular-nums">{row.quantity}</td>
                    <td>
                      {row.productUrl ? (
                        <a
                          href={row.productUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--accent)] underline-offset-2 hover:underline"
                        >
                          открыть
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{row.subscription || "—"}</td>
                    <td className="text-right tabular-nums whitespace-nowrap font-medium">
                      {formatMoney(row.lineTotal)}
                    </td>
                    <td>{row.priority}</td>
                    <td>{row.status}</td>
                    {editable ? (
                      <td>
                        <details>
                          <summary className="cursor-pointer whitespace-nowrap text-[var(--accent)]">
                            Изменить
                          </summary>
                          <form
                            action={updatePurchaseItemAction}
                            className="mt-2 grid min-w-72 gap-2"
                          >
                            <input type="hidden" name="id" value={row.id} />
                            <input
                              className="field"
                              name="type"
                              list="purchase-types"
                              defaultValue={row.type}
                              required
                            />
                            <input
                              className="field"
                              name="title"
                              defaultValue={row.title}
                              required
                            />
                            <input
                              className="field"
                              name="comment"
                              defaultValue={row.comment ?? ""}
                            />
                            <input
                              className="field"
                              type="date"
                              name="paymentDate"
                              defaultValue={toDateInputValue(row.paymentDate)}
                            />
                            <input
                              className="field"
                              name="unitPrice"
                              defaultValue={row.unitPrice}
                              required
                            />
                            <input
                              className="field"
                              name="quantity"
                              defaultValue={row.quantity}
                              required
                            />
                            <input
                              className="field"
                              name="productUrl"
                              defaultValue={row.productUrl ?? ""}
                            />
                            <input
                              className="field"
                              name="subscription"
                              list="purchase-subs"
                              defaultValue={row.subscription ?? "нет"}
                            />
                            <input
                              className="field"
                              name="priority"
                              list="purchase-priorities"
                              defaultValue={row.priority}
                            />
                            <input
                              className="field"
                              name="status"
                              list="purchase-statuses"
                              defaultValue={row.status}
                            />
                            <button className="btn" type="submit">
                              Сохранить
                            </button>
                          </form>
                          <form action={deletePurchaseItemAction} className="mt-2">
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
          <p className="text-sm text-[var(--muted)]">
            Итого по списку:{" "}
            <span className="font-medium text-[var(--ink)]">{formatMoney(total)}</span>
          </p>
        </>
      )}
    </div>
  );
}
