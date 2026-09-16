import Link from "next/link";
import {
  createEmployeeAction,
  deleteEmployeeAction,
  updateEmployeeAction,
} from "@/app/actions";
import { canEdit, requireAccess } from "@/lib/access";
import { getYearDayHeatmap, listEmployees } from "@/modules/vacations/service";
import { YearHeatmapEditor } from "@/components/vacations/year-heatmap";
import { CollapsibleFormPanel, EmptyState, PageHeader } from "@/components/ui";

const ROLES = [
  "руководитель продакшна",
  "оператор",
  "контент-продюсер",
  "монтажёр-оператор",
  "продюсер пост продакшна",
  "монтажёр",
  "дизайнер",
];

type Tab = "calendar" | "people";

export default async function VacationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; year?: string }>;
}) {
  const access = await requireAccess("view");
  const editable = canEdit(access);
  const params = await searchParams;
  const tab = (params.tab === "people" ? "people" : "calendar") as Tab;
  const currentYear = new Date().getFullYear();
  const year = Number(params.year) || currentYear;

  const [heatmap, employees] = await Promise.all([
    getYearDayHeatmap(year),
    listEmployees(true),
  ]);
  const activeEmployees = employees.filter((e) => e.active);

  const tabs: { id: Tab; label: string; href: string }[] = [
    { id: "calendar", label: "Календарь", href: `/vacations?tab=calendar&year=${year}` },
    { id: "people", label: "Сотрудники", href: `/vacations?tab=people&year=${year}` },
  ];

  return (
    <div className="vacations-page space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Календарь отпусков" />
        <form className="mb-6 flex items-center gap-2">
          <input type="hidden" name="tab" value={tab} />
          <select className="field w-auto" name="year" defaultValue={year}>
            {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button className="btn" type="submit">
            Год
          </button>
        </form>
      </div>

      <div className="vacations-tabs">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`vacations-tab ${tab === item.id ? "is-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "calendar" ? (
        <section>
          <YearHeatmapEditor
            heatmap={heatmap}
            employees={activeEmployees.map((e) => ({
              id: e.id,
              fullName: e.fullName,
              role: e.role,
            }))}
            editable={editable}
          />
        </section>
      ) : null}

      {tab === "people" ? (
        <section className="space-y-5">
          {editable ? (
            <CollapsibleFormPanel title="Новый сотрудник">
              <form action={createEmployeeAction} className="grid gap-3 sm:grid-cols-3">
                <input className="field" name="fullName" placeholder="ФИО / имя" required />
                <input className="field" name="role" list="vacation-roles" placeholder="Роль" required />
                <datalist id="vacation-roles">
                  {ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                <button className="btn w-fit" type="submit">
                  Добавить
                </button>
              </form>
            </CollapsibleFormPanel>
          ) : null}

          {employees.length === 0 ? (
            <EmptyState
              title="Пока никого нет"
              hint="Добавьте сотрудников — их можно будет выбрать при назначении отпуска."
            />
          ) : (
            <div className="vacations-people">
              {employees.map((person) => (
                <article
                  key={person.id}
                  id={`employee-${person.id}`}
                  className={`vacations-person scroll-mt-28 ${person.active ? "" : "is-inactive"}`}
                >
                  <div>
                    <p className="font-medium">{person.fullName}</p>
                    <p className="text-sm text-[var(--muted)]">{person.role}</p>
                  </div>
                  {editable ? (
                    <details>
                      <summary className="cursor-pointer text-sm text-[var(--accent)]">
                        Изменить
                      </summary>
                      <form action={updateEmployeeAction} className="mt-3 grid gap-2">
                        <input type="hidden" name="id" value={person.id} />
                        <input
                          className="field"
                          name="fullName"
                          defaultValue={person.fullName}
                          required
                        />
                        <input
                          className="field"
                          name="role"
                          list="vacation-roles"
                          defaultValue={person.role}
                          required
                        />
                        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
                          <input type="checkbox" name="active" defaultChecked={person.active} />
                          Активен (в календаре)
                        </label>
                        <button className="btn w-fit" type="submit">
                          Сохранить
                        </button>
                      </form>
                      <form action={deleteEmployeeAction} className="mt-2">
                        <input type="hidden" name="id" value={person.id} />
                        <button className="btn-danger" type="submit">
                          Удалить
                        </button>
                      </form>
                    </details>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
