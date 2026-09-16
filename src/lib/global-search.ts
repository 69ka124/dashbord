import { formatDate } from "@/lib/dates";
import { formatMoney, toNumber } from "@/lib/money";
import { listAuditLogs } from "@/modules/audit/service";
import { getCounterpartyLimits, listCounterparties } from "@/modules/catalog/service";
import { listDesignOrders } from "@/modules/design/service";
import { listExpenseRecords } from "@/modules/expense/service";
import { listIncomeRecords } from "@/modules/income/service";
import { listPayments, listWorks } from "@/modules/ledger/service";
import { listProductionOrders } from "@/modules/production/service";
import { listPurchaseItems } from "@/modules/purchases/service";
import { listEmployees, listVacationLeaves } from "@/modules/vacations/service";

export type GlobalSearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type GlobalSearchSection = {
  id: string;
  label: string;
  href: string;
  count: number;
  hits: GlobalSearchHit[];
};

export type GlobalSearchResult = {
  query: string;
  total: number;
  sections: GlobalSearchSection[];
};

const HIT_LIMIT = 5;

export async function runGlobalSearch(query: string, year?: number): Promise<GlobalSearchResult> {
  const q = query.trim();
  if (!q) {
    return { query: "", total: 0, sections: [] };
  }

  const yearFilters = year ? { year } : {};

  const [
    income,
    expense,
    production,
    design,
    purchases,
    leaves,
    employees,
    works,
    payments,
    counterparties,
    limits,
    audit,
  ] = await Promise.all([
    listIncomeRecords({ ...yearFilters, q }),
    listExpenseRecords({ ...yearFilters, q }),
    listProductionOrders({ ...yearFilters, q }),
    listDesignOrders({ ...yearFilters, q }),
    listPurchaseItems({ ...yearFilters, q }),
    listVacationLeaves(year ? { year } : {}),
    listEmployees(true),
    listWorks({ ...yearFilters, q }),
    listPayments(year ? { year } : {}),
    listCounterparties(),
    getCounterpartyLimits(year),
    listAuditLogs({ ...yearFilters, q }),
  ]);

  const employeeMatches = employees.filter((row) =>
    [row.fullName, row.role].some((part) => part.toLowerCase().includes(q.toLowerCase())),
  );

  const leaveMatches = leaves.filter((row) =>
    [row.employeeName, row.leaveType, row.status, row.substitute, row.comment]
      .filter(Boolean)
      .some((part) => String(part).toLowerCase().includes(q.toLowerCase())),
  );

  const counterpartyMatches = counterparties.filter((row) =>
    [row.name, row.code, row.inn, row.mainCategory, row.responsible, row.comment]
      .filter(Boolean)
      .some((part) => String(part).toLowerCase().includes(q.toLowerCase())),
  );

  const limitMatches = limits.filter((row) =>
    row.counterpartyName.toLowerCase().includes(q.toLowerCase()),
  );

  const needle = q.toLowerCase();
  const paymentMatches = payments.filter((row) =>
    [row.type, row.comment, row.counterparty?.name, row.work?.title]
      .filter(Boolean)
      .some((part) => String(part).toLowerCase().includes(needle)),
  );

  const sections: GlobalSearchSection[] = [
    {
      id: "income",
      label: "Доходы",
      href: "/?#income",
      count: income.length,
      hits: income.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.payer || row.incomeCode,
        subtitle: `${row.project} · ${formatMoney(row.amount)}`,
        href: `/#income-row-${row.id}`,
      })),
    },
    {
      id: "expense",
      label: "Расходы",
      href: "/?#expenses",
      count: expense.length,
      hits: expense.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.recipient || row.expenseCode,
        subtitle: `${row.task} · ${formatMoney(row.totalToPay)}`,
        href: `/#expense-row-${row.id}`,
      })),
    },
    {
      id: "production",
      label: "Продакшн",
      href: "/production",
      count: production.length,
      hits: production.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.orderCode,
        subtitle: `${row.client} · ${row.project}`,
        href: `/production#order-${row.id}`,
      })),
    },
    {
      id: "design",
      label: "Дизайн",
      href: "/design",
      count: design.length,
      hits: design.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.orderCode,
        subtitle: `${row.client} · ${row.project}`,
        href: `/design#order-${row.id}`,
      })),
    },
    {
      id: "purchases",
      label: "Закупки",
      href: "/purchases",
      count: purchases.length,
      hits: purchases.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: `${row.type} · ${formatMoney(row.lineTotal)}`,
        href: `/purchases#purchase-${row.id}`,
      })),
    },
    {
      id: "vacations",
      label: "Отпуска",
      href: "/vacations",
      count: leaveMatches.length + employeeMatches.length,
      hits: [
        ...leaveMatches.slice(0, 3).map((row) => ({
          id: row.id,
          title: row.employeeName,
          subtitle: `${formatDate(row.startDate)} – ${formatDate(row.endDate)} · ${row.status}`,
          href: `/vacations?tab=calendar#employee-${row.employeeId}`,
        })),
        ...employeeMatches.slice(0, 2).map((row) => ({
          id: row.id,
          title: row.fullName,
          subtitle: row.role,
          href: `/vacations#employee-${row.id}`,
        })),
      ].slice(0, HIT_LIMIT),
    },
    {
      id: "works",
      label: "Продакшн",
      href: "/works",
      count: works.length,
      hits: works.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: `${row.counterparty?.name ?? "—"} · ${formatMoney(toNumber(row.amount))}`,
        href: `/works#work-${row.id}`,
      })),
    },
    {
      id: "payments",
      label: "Оплаты",
      href: "/payments",
      count: paymentMatches.length,
      hits: paymentMatches.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.type,
        subtitle: `${row.counterparty?.name ?? "—"} · ${formatMoney(toNumber(row.amount))}`,
        href: `/payments#payment-${row.id}`,
      })),
    },
    {
      id: "counterparties",
      label: "Контрагенты",
      href: "/counterparties",
      count: counterpartyMatches.length,
      hits: counterpartyMatches.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.name,
        subtitle: row.code ?? row.mainCategory ?? undefined,
        href: `/counterparties#cp-${row.id}`,
      })),
    },
    {
      id: "limits",
      label: "Лимиты К/А",
      href: "/?#limits",
      count: limitMatches.length,
      hits: limitMatches.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: row.counterpartyName,
        subtitle: `${row.percent.toFixed(1)}% · ${formatMoney(row.remaining)} остаток`,
        href: `/#limit-row-${row.id}`,
      })),
    },
    {
      id: "history",
      label: "История",
      href: "/history",
      count: audit.length,
      hits: audit.slice(0, HIT_LIMIT).map((row) => ({
        id: row.id,
        title: `${row.tab} · ${row.field}`,
        subtitle: `${row.userLabel} · ${row.newValue ?? row.oldValue ?? ""}`,
        href: `/history#audit-${row.id}`,
      })),
    },
  ].filter((section) => section.count > 0);

  return {
    query: q,
    total: sections.reduce((sum, section) => sum + section.count, 0),
    sections,
  };
}
