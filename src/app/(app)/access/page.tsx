import { createAccessGrantAction, revokeAccessGrantAction } from "@/app/actions";
import { requireAccess } from "@/lib/access";
import { formatDate } from "@/lib/dates";
import { listAccessGrants } from "@/modules/sharing/service";
import { getLatestSpreadsheetSnapshot } from "@/modules/google-sync/archive";
import { getGoogleSyncConfig } from "@/modules/google-sync/config";
import { GoogleSyncPanel } from "@/components/google-sync-panel";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AccessPage() {
  const access = await requireAccess("owner");
  if (access.kind !== "owner") {
    throw new Error("Только владелец может управлять доступом");
  }

  const [grants, config, lastArchive] = await Promise.all([
    listAccessGrants(),
    getGoogleSyncConfig(),
    getLatestSpreadsheetSnapshot(),
  ]);

  const ownerEmail = process.env.OWNER_EMAIL ?? "";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Доступ"
        description="Приглашения по email и перенос данных из Google Таблицы."
      />

      <GoogleSyncPanel
        spreadsheetUrl={config.spreadsheetUrl ?? ""}
        lastPullAt={config.lastPullAt ? formatDate(config.lastPullAt) : null}
        lastError={config.lastError}
        lastArchive={
          lastArchive
            ? {
                createdAt: formatDate(lastArchive.createdAt),
                sheetCount: lastArchive.sheetCount,
                rowCount: lastArchive.rowCount,
                extraSheets: lastArchive.extraSheets,
              }
            : null
        }
      />

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          Доступ по email
        </h2>

        <div className="panel space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Владелец: <span className="font-medium text-[var(--ink)]">{ownerEmail || "не задан в OWNER_EMAIL"}</span>
            . Коллеги входят на странице входа тем же email, который вы добавите ниже.
          </p>
          <h3 className="font-[family-name:var(--font-display)] text-lg">Добавить email</h3>
          <form action={createAccessGrantAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input
              className="field"
              type="email"
              name="email"
              placeholder="colleague@company.com"
              required
            />
            <select className="field" name="role" defaultValue="view">
              <option value="view">Только просмотр</option>
              <option value="edit">Редактирование</option>
            </select>
            <input className="field" name="label" placeholder="Подпись (например, бухгалтер)" />
            <input className="field" type="date" name="expiresAt" />
            <button className="btn w-fit" type="submit">
              Выдать доступ
            </button>
          </form>
          <p className="text-xs text-[var(--muted)]">
            Срок необязателен. Пустая дата = бессрочно до отзыва. Пароль не нужен — достаточно email.
          </p>
        </div>

        {grants.length === 0 ? (
          <EmptyState title="Приглашений пока нет" hint="Добавьте email коллеги." />
        ) : (
          <div className="space-y-3">
            {grants.map((grant) => {
              const inactive = Boolean(
                grant.revokedAt || (grant.expiresAt && grant.expiresAt.getTime() < Date.now()),
              );
              return (
                <div key={grant.id} className="panel space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {grant.email}
                        {grant.label ? ` · ${grant.label}` : ""} ·{" "}
                        {grant.role === "view" ? "просмотр" : "редактирование"}
                      </p>
                      <p className="text-sm text-[var(--muted)]">
                        Добавлен {formatDate(grant.createdAt)}
                        {grant.expiresAt ? ` · до ${formatDate(grant.expiresAt)}` : " · бессрочно"}
                        {grant.revokedAt ? ` · отозван ${formatDate(grant.revokedAt)}` : ""}
                        {inactive && !grant.revokedAt ? " · истёк" : ""}
                      </p>
                    </div>
                    {!grant.revokedAt ? (
                      <form action={revokeAccessGrantAction}>
                        <input type="hidden" name="id" value={grant.id} />
                        <button className="btn-danger" type="submit">
                          Отозвать
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
