import type { WorkModule, WorkStatus } from "@/modules/ledger/service";
import {
  createWorkAction,
  deleteWorkAction,
  updateWorkAction,
} from "@/app/actions";
import { canEdit, requireAccess } from "@/lib/access";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { formatMoney, toNumber } from "@/lib/money";
import { listCounterparties, listWorkTypes } from "@/modules/catalog/service";
import { listWorks, workAnchorId } from "@/modules/ledger/service";
import { CollapsibleFormPanel, EmptyState, PageHeader } from "@/components/ui";
import { YearFilterSelect } from "@/components/ui/year-filter-select";

const statusLabels: Record<WorkStatus, string> = {
  planned: "План",
  in_progress: "В работе",
  done: "Готово",
  cancelled: "Отменено",
};

const moduleLabels: Record<WorkModule, string> = {
  work: "Подряд",
  production: "Продакшн",
  design: "Дизайн",
  postproduction: "Постпродакшн",
};

const productionTypes = ["Съёмка", "Монтаж", "Постпродакшн"];

export default async function WorksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    workTypeId?: string;
    counterpartyId?: string;
    module?: string;
    q?: string;
    year?: string;
  }>;
}) {
  const access = await requireAccess("view");
  const editable = canEdit(access);
  const params = await searchParams;
  const year = params.year ? Number(params.year) : undefined;
  const module = (params.module as WorkModule | "all" | undefined) ?? "all";

  const [works, workTypes, counterparties] = await Promise.all([
    listWorks({
      status: (params.status as WorkStatus | "all" | undefined) ?? "all",
      workTypeId: params.workTypeId || undefined,
      counterpartyId: params.counterpartyId || undefined,
      module,
      q: params.q,
      year: Number.isFinite(year) ? year : undefined,
    }),
    listWorkTypes(true),
    listCounterparties(),
  ]);

  const typeOptions = [...new Set([...workTypes.map((t) => t.name), ...productionTypes])];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Продакшн"
        description="Подряд, продакшн, постпродакшн и дизайн: тип услуги, контрагент, Jira и сроки."
      />

      <form className="panel grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <YearFilterSelect value={Number.isFinite(year) ? year : undefined} />
        <input
          className="field lg:col-span-2"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Поиск по названию, проекту, клиенту"
        />
        <select className="field" name="module" defaultValue={module}>
          <option value="all">Все направления</option>
          <option value="work">Подряд</option>
          <option value="production">Продакшн</option>
          <option value="postproduction">Постпродакшн</option>
          <option value="design">Дизайн</option>
        </select>
        <select className="field" name="status" defaultValue={params.status ?? "all"}>
          <option value="all">Все статусы</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="field"
          name="workTypeId"
          defaultValue={params.workTypeId ?? ""}
        >
          <option value="">Все типы</option>
          {workTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          className="field"
          name="counterpartyId"
          defaultValue={params.counterpartyId ?? ""}
        >
          <option value="">Все контрагенты</option>
          {counterparties.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.code} · ` : ""}
              {c.name}
            </option>
          ))}
        </select>
        <button className="btn sm:col-span-2 lg:col-span-6 lg:w-fit" type="submit">
          Применить фильтры
        </button>
      </form>

      {editable ? (
        <CollapsibleFormPanel title="Новая работа">
          <form action={createWorkAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <select className="field" name="module" defaultValue={module === "all" ? "production" : module}>
              <option value="work">Подряд</option>
              <option value="production">Продакшн</option>
              <option value="postproduction">Постпродакшн</option>
              <option value="design">Дизайн</option>
            </select>
            <input className="field sm:col-span-2 lg:col-span-3" name="title" placeholder="Название / проект" required />
            <input className="field" name="project" placeholder="Проект" />
            <input className="field" name="client" placeholder="Клиент / заказчик" />
            <input className="field" name="amount" placeholder="Сумма" required />
            <input className="field" name="orderIncome" placeholder="Доход по заказу" />
            <input className="field" name="estimate" placeholder="Смета" />
            <input className="field" type="date" name="receivedAt" />
            <input className="field" type="date" name="dueDate" />
            <select className="field" name="status" defaultValue="in_progress">
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div>
              <input
                className="field"
                name="workTypeName"
                list="work-type-options"
                placeholder="Тип услуги (впишите свой)"
              />
              <datalist id="work-type-options">
                {typeOptions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <select className="field" name="counterpartyId">
              <option value="">Контрагент из справочника</option>
              {counterparties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} · ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
            <input
              className="field"
              name="counterpartyName"
              placeholder="Или новый контрагент (создастся автоматически)"
            />
            <input className="field" name="jiraUrl" placeholder="Ссылка на Jira" />
            <input className="field" name="ke" placeholder="КЕ" />
            <input className="field sm:col-span-2" name="materials" placeholder="Материалы" />
            <input className="field sm:col-span-2" name="comment" placeholder="Комментарий" />
            <button className="btn w-fit" type="submit">
              Добавить
            </button>
          </form>
        </CollapsibleFormPanel>
      ) : null}

      {works.length === 0 ? (
        <EmptyState
          title="Записей пока нет"
          hint="Создайте первую работу или снимите фильтры."
        />
      ) : (
        <div className="space-y-4">
          {works.map((work) => {
            const paid = work.payments
              .filter((p) => p.type === "expense")
              .reduce((s, p) => s + toNumber(p.amount), 0);
            const rest = Math.max(toNumber(work.amount) - paid, 0);
            const anchor = workAnchorId(work);

            return (
              <div key={`${work.source}-${work.id}`} id={anchor} className="panel scroll-mt-28 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--ink)]">{work.title}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {moduleLabels[work.source]}
                      {work.expenseCode ? ` · ${work.expenseCode}` : ""}
                      {` · ${work.workType.name}`}
                      {work.counterparty ? ` · ${work.counterparty.name}` : work.client ? ` · ${work.client}` : ""}
                      {` · ${statusLabels[work.status as WorkStatus]}`}
                      {work.dueDate ? ` · до ${formatDate(work.dueDate)}` : ""}
                    </p>
                    {work.jiraUrl ? (
                      <a
                        href={work.jiraUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-[var(--accent)] hover:underline"
                      >
                        Jira
                      </a>
                    ) : null}
                  </div>
                  <div className="text-right text-sm">
                    <p className="tabular-nums font-medium">{formatMoney(work.amount)}</p>
                    {work.orderIncome != null && work.orderIncome > 0 ? (
                      <p className="text-[var(--muted)]">доход {formatMoney(work.orderIncome)}</p>
                    ) : null}
                    <p className="text-[var(--muted)]">
                      выплачено {formatMoney(paid)} · остаток {formatMoney(rest)}
                    </p>
                  </div>
                </div>

                {editable ? (
                  <details>
                    <summary className="cursor-pointer text-sm text-[var(--accent)]">
                      Редактировать
                    </summary>
                    <form action={updateWorkAction} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <input type="hidden" name="id" value={work.id} />
                      <input type="hidden" name="source" value={work.source} />
                      <input
                        className="field sm:col-span-2 lg:col-span-3"
                        name="title"
                        defaultValue={work.title}
                        required
                      />
                      <input className="field" name="project" defaultValue={work.project} />
                      <input className="field" name="client" defaultValue={work.client ?? ""} />
                      <input
                        className="field"
                        name="amount"
                        defaultValue={toNumber(work.amount)}
                        required
                      />
                      <input
                        className="field"
                        name="orderIncome"
                        defaultValue={work.orderIncome ?? ""}
                      />
                      <input className="field" name="estimate" defaultValue={work.estimate ?? ""} />
                      <input
                        className="field"
                        type="date"
                        name="receivedAt"
                        defaultValue={toDateInputValue(work.receivedAt)}
                      />
                      <input
                        className="field"
                        type="date"
                        name="dueDate"
                        defaultValue={toDateInputValue(work.dueDate)}
                      />
                      <select className="field" name="status" defaultValue={work.status}>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <input
                        className="field"
                        name="workTypeName"
                        list="work-type-options"
                        defaultValue={work.workType.name}
                      />
                      <select
                        className="field"
                        name="counterpartyId"
                        defaultValue={work.counterpartyId ?? ""}
                      >
                        <option value="">Без контрагента</option>
                        {counterparties.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code ? `${c.code} · ` : ""}
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="field sm:col-span-2"
                        name="jiraUrl"
                        defaultValue={work.jiraUrl ?? ""}
                        placeholder="Ссылка на Jira"
                      />
                      <input className="field" name="ke" defaultValue={work.ke ?? ""} />
                      <input
                        className="field sm:col-span-2"
                        name="materials"
                        defaultValue={work.materials ?? ""}
                      />
                      <input
                        className="field sm:col-span-2 lg:col-span-4"
                        name="comment"
                        defaultValue={work.comment ?? ""}
                      />
                      <div className="flex gap-2 lg:col-span-4">
                        <button className="btn" type="submit">
                          Сохранить
                        </button>
                      </div>
                    </form>
                    <form action={deleteWorkAction} className="mt-2">
                      <input type="hidden" name="id" value={work.id} />
                      <input type="hidden" name="source" value={work.source} />
                      <button className="btn-danger" type="submit">
                        Удалить
                      </button>
                    </form>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
