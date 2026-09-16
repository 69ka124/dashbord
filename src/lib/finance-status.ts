import type { WorkStatus } from "@/modules/ledger/service";

export function isPaidExpense(status: string) {
  const s = status.trim().toLowerCase();
  return s === "оплачено" || s === "оплачен";
}

export function isCancelledExpenseWork(status: string) {
  const s = status.trim().toLowerCase();
  return s === "отменено" || s === "cancelled";
}

export function isCancelledIncome(status: string) {
  return status.trim().toLowerCase() === "отменено";
}

export function isReceivedIncome(status: string) {
  const s = status.trim().toLowerCase();
  return s === "получено" || s === "получен";
}

const WORK_STATUS_TO_RU: Record<WorkStatus, string> = {
  planned: "план",
  in_progress: "в работе",
  done: "готово",
  cancelled: "отменено",
};

const RU_TO_WORK_STATUS: Record<string, WorkStatus> = {
  план: "planned",
  planned: "planned",
  "в работе": "in_progress",
  in_progress: "in_progress",
  готово: "done",
  done: "done",
  отменено: "cancelled",
  cancelled: "cancelled",
};

export function workStatusToRu(status: WorkStatus): string {
  return WORK_STATUS_TO_RU[status] ?? "в работе";
}

export function ruToWorkStatus(status: string): WorkStatus {
  return RU_TO_WORK_STATUS[status.trim().toLowerCase()] ?? "in_progress";
}
