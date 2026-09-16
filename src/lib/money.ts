import { Decimal } from "@prisma/client/runtime/library";

export function toNumber(value: Decimal | number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return value.toNumber();
}

export function formatMoney(value: Decimal | number | string | null | undefined): string {
  const n = toNumber(value);
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

export function parseMoney(input: FormDataEntryValue | null): number {
  const raw = String(input ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Некорректная сумма");
  }
  return n;
}

export function parseMoneyOptional(input: FormDataEntryValue | null): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  return parseMoney(input);
}
