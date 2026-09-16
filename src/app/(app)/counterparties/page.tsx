import {
  createCounterpartyAction,
  deleteCounterpartyAction,
  deleteCounterpartyLimitAction,
  updateCounterpartyAction,
  upsertCounterpartyLimitAction,
} from "@/app/actions";
import { canEdit, requireAccess } from "@/lib/access";
import { formatMoney } from "@/lib/money";
import { DEFAULT_COUNTERPARTY_LIMIT } from "@/lib/codes";
import { parseYearParam } from "@/lib/year-filter";
import { getCounterpartyDirectory, listCounterparties } from "@/modules/catalog/service";
import { CollapsibleFormPanel, EmptyState, PageHeader } from "@/components/ui";
import { YearFilterSelect } from "@/components/ui/year-filter-select";

const RECIPIENT_TYPES = ["физлицо", "ИП", "ООО", "АО", "самозанятый"];
const CATEGORIES = ["подряд", "материалы", "лицензии", "услуги", "прочее"];
const STATUSES = ["активен", "пауза", "архив"];

export default async function CounterpartiesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; q?: string; status?: string }>;
}) {
  const access = await requireAccess("view");
  const editable = canEdit(access);
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = parseYearParam(params.year);
  const limitsYear = year ?? currentYear;

  const [rows, all] = await Promise.all([
    getCounterpartyDirectory(year),
    listCounterparties(),
  ]);

  const filtered = rows.filter((row) => {
    if (params.status && row.status !== params.status) return false;
    if (params.q?.trim()) {
      const q = params.q.trim().toLowerCase();
      const hay = [
        row.code,
        row.name,
        row.shortTabName,
        row.legalName,
        row.inn,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Справочник К/А"
          description="Вся информация по контрагентам: лимиты, обязательства, реквизиты и контроль."
        />
      </div>

      <form className="panel grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          className="field lg:col-span-2"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Поиск: ID, имя, ИНН"
        />
        <select className="field" name="status" defaultValue={params.status ?? ""}>
          <option value="">Все статусы</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <YearFilterSelect value={year} label="Лимит" />
        <button className="btn w-fit" type="submit">
          Применить
        </button>
      </form>

      {editable ? (
        <CollapsibleFormPanel title="Новый К/А">
          <form
            action={createCounterpartyAction}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input className="field" name="name" placeholder="Получатель / К/А" required />
            <input className="field" name="shortTabName" placeholder="Короткое имя вкладки" />
            <input
              className="field"
              name="recipientType"
              list="ca-recipient-types"
              placeholder="Тип получателя"
            />
            <datalist id="ca-recipient-types">
              {RECIPIENT_TYPES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <input className="field" name="tabName" placeholder="Вкладка К/А" />
            <input className="field" name="legalName" placeholder="Юридическое название" />
            <input className="field" name="inn" placeholder="ИНН" />
            <input
              className="field"
              name="mainCategory"
              list="ca-categories"
              placeholder="Основная категория"
            />
            <datalist id="ca-categories">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <input className="field" name="contractFolder" placeholder="Договор / папка" />
            <input
              className="field"
              name="limitControl"
              placeholder="Контроль лимита"
              defaultValue="1500000"
            />
            <input className="field" name="status" list="ca-statuses" defaultValue="активен" />
            <datalist id="ca-statuses">
              {STATUSES.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <input type="checkbox" name="separateTab" />
              Отдельная вкладка
            </label>
            <input className="field lg:col-span-2" name="comment" placeholder="Комментарий" />
            <p className="text-sm text-[var(--muted)] lg:col-span-2">
              Годовой лимит: {formatMoney(DEFAULT_COUNTERPARTY_LIMIT)} (назначается автоматически)
            </p>
            <button className="btn w-fit" type="submit">
              Добавить
            </button>
          </form>
        </CollapsibleFormPanel>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState title="Справочник пуст" hint="Добавьте первого контрагента." />
      ) : (
        <div className="table-wrap">
          <table className="data ca-directory-table">
            <thead>
              <tr>
                <th>ID К/А</th>
                <th>Получатель / К/А</th>
                <th>Короткое имя вкладки</th>
                <th>Тип получателя</th>
                <th>Вкладка К/А</th>
                <th>Год лимита</th>
                <th className="text-right">Годовой лимит</th>
                <th className="text-right">Текущие обязательства</th>
                <th className="text-right">Оплачено</th>
                <th className="text-right">Использовано всего</th>
                <th className="text-right">Доступный остаток</th>
                <th className="text-right">% использования</th>
                <th>Юридическое название</th>
                <th>ИНН</th>
                <th>Основная категория</th>
                <th>Договор / папка</th>
                <th>Контроль лимита</th>
                <th>Отдельная вкладка</th>
                <th>Статус</th>
                <th>Комментарий</th>
                {editable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} id={`cp-${row.id}`} className="scroll-mt-28">
                  <td className="whitespace-nowrap font-medium">{row.code || "—"}</td>
                  <td className="font-medium whitespace-nowrap">{row.name}</td>
                  <td>{row.shortTabName || "—"}</td>
                  <td>{row.recipientType || "—"}</td>
                  <td>{row.tabName || "—"}</td>
                  <td>{row.limitYear ?? "—"}</td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {row.annualLimit == null ? "—" : formatMoney(row.annualLimit)}
                  </td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {formatMoney(row.obligations)}
                  </td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {formatMoney(row.paid)}
                  </td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {formatMoney(row.used)}
                  </td>
                  <td
                    className={`text-right tabular-nums whitespace-nowrap ${
                      row.remaining != null && row.remaining < 0 ? "text-[var(--negative)]" : ""
                    }`}
                  >
                    {row.remaining == null ? "—" : formatMoney(row.remaining)}
                  </td>
                  <td
                    className={`text-right tabular-nums ${
                      row.percent != null && row.percent > 100
                        ? "text-[var(--negative)] font-medium"
                        : ""
                    }`}
                  >
                    {row.percent == null ? "—" : `${row.percent.toFixed(1)}%`}
                  </td>
                  <td>{row.legalName || "—"}</td>
                  <td className="whitespace-nowrap">{row.inn || "—"}</td>
                  <td>{row.mainCategory || "—"}</td>
                  <td>{row.contractFolder || "—"}</td>
                  <td>{row.limitControl || "—"}</td>
                  <td>{row.separateTab ? "да" : "нет"}</td>
                  <td>{row.status}</td>
                  <td className="max-w-[10rem] truncate" title={row.comment ?? ""}>
                    {row.comment || "—"}
                  </td>
                  {editable ? (
                    <td>
                      <details>
                        <summary className="cursor-pointer whitespace-nowrap text-[var(--accent)]">
                          Изменить
                        </summary>
                        <form
                          action={updateCounterpartyAction}
                          className="mt-2 grid min-w-72 gap-2"
                        >
                          <input type="hidden" name="id" value={row.id} />
                          <input
                            className="field"
                            name="name"
                            defaultValue={row.name}
                            required
                          />
                          <input
                            className="field"
                            name="shortTabName"
                            defaultValue={row.shortTabName ?? ""}
                          />
                          <input
                            className="field"
                            name="recipientType"
                            list="ca-recipient-types"
                            defaultValue={row.recipientType ?? ""}
                          />
                          <input
                            className="field"
                            name="tabName"
                            defaultValue={row.tabName ?? ""}
                          />
                          <input
                            className="field"
                            name="legalName"
                            defaultValue={row.legalName ?? ""}
                          />
                          <input className="field" name="inn" defaultValue={row.inn ?? ""} />
                          <input
                            className="field"
                            name="mainCategory"
                            list="ca-categories"
                            defaultValue={row.mainCategory ?? ""}
                          />
                          <input
                            className="field"
                            name="contractFolder"
                            defaultValue={row.contractFolder ?? ""}
                          />
                          <input
                            className="field"
                            name="limitControl"
                            defaultValue={row.limitControl ?? ""}
                          />
                          <input
                            className="field"
                            name="status"
                            list="ca-statuses"
                            defaultValue={row.status}
                          />
                          <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                            <input
                              type="checkbox"
                              name="separateTab"
                              defaultChecked={row.separateTab}
                            />
                            Отдельная вкладка
                          </label>
                          <input
                            className="field"
                            name="comment"
                            defaultValue={row.comment ?? ""}
                          />
                          <button className="btn" type="submit">
                            Сохранить карточку
                          </button>
                        </form>
                        <form
                          action={upsertCounterpartyLimitAction}
                          className="mt-2 grid gap-2"
                        >
                          <input type="hidden" name="counterpartyId" value={row.id} />
                          <input
                            className="field"
                            type="number"
                            name="year"
                            defaultValue={row.limitYear ?? year}
                            required
                          />
                          <p className="text-sm text-[var(--muted)]">
                            Годовой лимит: {formatMoney(DEFAULT_COUNTERPARTY_LIMIT)}
                          </p>
                          <button className="btn" type="submit">
                            Обновить год лимита
                          </button>
                        </form>
                        {row.limitId ? (
                          <form action={deleteCounterpartyLimitAction} className="mt-2">
                            <input type="hidden" name="id" value={row.limitId} />
                            <button className="btn-danger" type="submit">
                              Удалить лимит
                            </button>
                          </form>
                        ) : null}
                        <form action={deleteCounterpartyAction} className="mt-2">
                          <input type="hidden" name="id" value={row.id} />
                          <button className="btn-danger" type="submit">
                            Удалить К/А
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

      <p className="text-xs text-[var(--muted)]">
        В справочнике {filtered.length} из {all.length} контрагентов · расчёт обязательств и
        оплат за {year ? `${year} год` : "всё время"}
      </p>
    </div>
  );
}
