import { addDays, differenceInDays, endOfDay, startOfDay } from "date-fns";
import { formatDate } from "@/lib/dates";
import { isCancelledExpenseWork, isPaidExpense } from "@/lib/finance-status";
import type { DashboardAnomaly } from "@/modules/dashboard/service";
import type { DesignRow } from "@/modules/design/service";
import type { ExpenseRow } from "@/modules/expense/service";
import type { ProductionRow } from "@/modules/production/service";
import type { PurchaseRow } from "@/modules/purchases/service";
import type { LeaveRow } from "@/modules/vacations/service";

export type DashboardSignalContext = {
  productionOrders: ProductionRow[];
  designOrders: DesignRow[];
  purchaseItems: PurchaseRow[];
  expenseRows: ExpenseRow[];
  vacationLeaves: LeaveRow[];
};

function isClosedOrderStatus(status: string) {
  const s = status.trim().toLowerCase();
  return s === "готово" || s === "отменено" || s === "done" || s === "cancelled";
}

function isSubscriptionPurchase(item: PurchaseRow) {
  const sub = item.subscription?.trim().toLowerCase() ?? "";
  if (sub === "ежемесячная" || sub === "годовая") return true;
  return item.type.trim().toLowerCase() === "подписка";
}

function isPurchaseSettled(status: string) {
  const s = status.trim().toLowerCase();
  return s === "оплачено" || s === "отменено";
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function buildOperationalAnomalies(context: DashboardSignalContext): DashboardAnomaly[] {
  const anomalies: DashboardAnomaly[] = [];
  const today = startOfDay(new Date());
  const inTwoDays = endOfDay(addDays(today, 2));

  for (const row of context.productionOrders) {
    if (!row.deadline || isClosedOrderStatus(row.status)) continue;
    const deadline = startOfDay(new Date(row.deadline));
    if (deadline < today) {
      anomalies.push({
        id: `prod-overdue-${row.id}`,
        severity: "critical",
        title: "Просрочен дедлайн продакшна",
        detail: `${row.orderCode} · ${row.client} · ${row.project}`,
        amount: row.income,
        anchor: `/works#production-${row.id}`,
      });
    } else if (deadline <= inTwoDays) {
      const daysLeft = differenceInDays(deadline, today);
      anomalies.push({
        id: `prod-soon-${row.id}`,
        severity: daysLeft <= 1 ? "critical" : "warn",
        title: "Дедлайн продакшна через 2 дня",
        detail: `${row.orderCode} · ${formatDate(row.deadline)} · ${row.project}`,
        amount: row.income,
        anchor: `/works#production-${row.id}`,
      });
    }
  }

  for (const row of context.designOrders) {
    if (!row.deadline || isClosedOrderStatus(row.status)) continue;
    const deadline = startOfDay(new Date(row.deadline));
    if (deadline < today) {
      anomalies.push({
        id: `design-overdue-${row.id}`,
        severity: "critical",
        title: "Просрочен дедлайн дизайна",
        detail: `${row.orderCode} · ${row.client} · ${row.project}`,
        amount: row.income,
        anchor: `/works#design-${row.id}`,
      });
    } else if (deadline <= inTwoDays) {
      const daysLeft = differenceInDays(deadline, today);
      anomalies.push({
        id: `design-soon-${row.id}`,
        severity: daysLeft <= 1 ? "critical" : "warn",
        title: "Дедлайн дизайна через 2 дня",
        detail: `${row.orderCode} · ${formatDate(row.deadline)} · ${row.project}`,
        amount: row.income,
        anchor: `/works#design-${row.id}`,
      });
    }
  }

  for (const row of context.purchaseItems) {
    if (!isSubscriptionPurchase(row)) continue;
    if (isPurchaseSettled(row.status)) continue;
    if (!row.paymentDate) continue;

    const due = startOfDay(new Date(row.paymentDate));
    const daysLeft = differenceInDays(due, today);

    if (daysLeft < 0) {
      anomalies.push({
        id: `sub-overdue-${row.id}`,
        severity: "critical",
        title: "Подписка просрочена",
        detail: `${row.title} · оплата ${formatDate(row.paymentDate)}`,
        amount: row.lineTotal,
        anchor: `/purchases#purchase-${row.id}`,
      });
    } else if (daysLeft <= 2) {
      anomalies.push({
        id: `sub-soon-${row.id}`,
        severity: daysLeft === 0 ? "critical" : "warn",
        title: daysLeft === 0 ? "Подписка заканчивается сегодня" : "Подписка заканчивается",
        detail: `${row.title} · ${daysLeft === 0 ? "сегодня" : `через ${daysLeft} дн.`}`,
        amount: row.lineTotal,
        anchor: `/purchases#purchase-${row.id}`,
      });
    }
  }

  for (const row of context.expenseRows) {
    if (isCancelledExpenseWork(row.workStatus)) continue;
    if (isPaidExpense(row.paymentStatus)) continue;
    if (!row.dueDate) continue;

    const due = startOfDay(new Date(row.dueDate));
    if (due < today) {
      anomalies.push({
        id: `work-overdue-${row.id}`,
        severity: "critical",
        title: "Просрочена работа / обязательство",
        detail: `${row.recipient} · ${row.task}`,
        amount: row.totalToPay,
        anchor: `/#expense-row-${row.id}`,
      });
    } else if (due <= inTwoDays) {
      const daysLeft = differenceInDays(due, today);
      anomalies.push({
        id: `work-soon-${row.id}`,
        severity: daysLeft <= 1 ? "critical" : "warn",
        title: "Срок работы через 2 дня",
        detail: `${row.recipient} · ${formatDate(row.dueDate)}`,
        amount: row.totalToPay,
        anchor: `/#expense-row-${row.id}`,
      });
    }
  }

  const activeLeaves = context.vacationLeaves.filter((leave) => {
    const status = leave.status.trim().toLowerCase();
    return status !== "отменён" && status !== "отменено";
  });

  for (const leave of activeLeaves) {
    const start = startOfDay(new Date(leave.startDate));
    const daysUntil = differenceInDays(start, today);

    if (daysUntil >= 0 && daysUntil <= 7 && !leave.substitute?.trim()) {
      anomalies.push({
        id: `leave-no-sub-${leave.id}`,
        severity: daysUntil <= 2 ? "critical" : "warn",
        title: "Отпуск без замены",
        detail: `${leave.employeeName} · ${formatDate(leave.startDate)}`,
        anchor: `/vacations?tab=people#employee-${leave.employeeId}`,
      });
    }

    if (daysUntil >= 0 && daysUntil <= 2) {
      anomalies.push({
        id: `leave-soon-${leave.id}`,
        severity: daysUntil === 0 ? "critical" : "warn",
        title: daysUntil === 0 ? "Отпуск начинается сегодня" : "Скоро отпуск",
        detail: `${leave.employeeName} · ${formatDate(leave.startDate)} – ${formatDate(leave.endDate)}`,
        anchor: `/vacations?tab=calendar#employee-${leave.employeeId}`,
      });
    }
  }

  for (let i = 0; i < activeLeaves.length; i += 1) {
    for (let j = i + 1; j < activeLeaves.length; j += 1) {
      const a = activeLeaves[i]!;
      const b = activeLeaves[j]!;
      if (
        rangesOverlap(
          startOfDay(new Date(a.startDate)),
          startOfDay(new Date(a.endDate)),
          startOfDay(new Date(b.startDate)),
          startOfDay(new Date(b.endDate)),
        )
      ) {
        anomalies.push({
          id: `leave-overlap-${a.id}-${b.id}`,
          severity: "warn",
          title: "Пересечение отпусков",
          detail: `${a.employeeName} и ${b.employeeName}`,
          anchor: `/vacations?tab=calendar`,
        });
      }
    }
  }

  return anomalies;
}
