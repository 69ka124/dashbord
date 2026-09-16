import { requireAccess } from "@/lib/access";
import { listAuditLogs, listAuditTabs, listAuditUsers } from "@/modules/audit/service";
import { EmptyState, PageHeader } from "@/components/ui";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    user?: string;
    year?: string;
    quarter?: string;
  }>;
}) {
  await requireAccess("view");
  const params = await searchParams;
  const currentYear = new Date().getFullYear();

  const [rows, users, tabs] = await Promise.all([
    listAuditLogs({
      q: params.q,
      tab: params.tab || undefined,
      userLabel: params.user || undefined,
      year: params.year ? Number(params.year) : undefined,
      quarter: params.quarter ? Number(params.quarter) : undefined,
    }),
    listAuditUsers(),
    listAuditTabs(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="История"
        description="Журнал действий пользователей с доступом: кто что изменил."
      />

      <form className="panel grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          className="field lg:col-span-2"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Поиск: пользователь, вкладка, ID, поле"
        />
        <select className="field" name="tab" defaultValue={params.tab ?? ""}>
          <option value="">Все вкладки</option>
          {tabs.map((tab) => (
            <option key={tab} value={tab}>
              {tab}
            </option>
          ))}
        </select>
        <select className="field" name="user" defaultValue={params.user ?? ""}>
          <option value="">Все пользователи</option>
          {users.map((user) => (
            <option key={user} value={user}>
              {user}
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
        <button className="btn w-fit" type="submit">
          Применить
        </button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="Пока нет записей"
          hint="Как только кто-то создаст или изменит данные — действия появятся здесь."
        />
      ) : (
        <div className="table-wrap">
          <table className="data history-table">
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Пользователь</th>
                <th>Вкладка</th>
                <th>ID</th>
                <th>Поле</th>
                <th>Старое значение</th>
                <th>Новое значение</th>
                <th>Комментарий</th>
                <th>Год</th>
                <th>Квартал</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} id={`audit-${row.id}`} className="scroll-mt-28">
                  <td className="whitespace-nowrap tabular-nums">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="whitespace-nowrap">{row.userLabel}</td>
                  <td>{row.tab}</td>
                  <td className="font-mono text-xs max-w-[8rem] truncate" title={row.entityId}>
                    {row.entityId}
                  </td>
                  <td>{row.field}</td>
                  <td className="max-w-[12rem] truncate" title={row.oldValue ?? ""}>
                    {row.oldValue || "—"}
                  </td>
                  <td className="max-w-[12rem] truncate" title={row.newValue ?? ""}>
                    {row.newValue || "—"}
                  </td>
                  <td className="max-w-[10rem] truncate" title={row.comment ?? ""}>
                    {row.comment || "—"}
                  </td>
                  <td>{row.year}</td>
                  <td>Q{row.quarter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
