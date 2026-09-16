export function cell(value: unknown): string {
  return String(value ?? "").trim();
}

export function parseSheetNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = cell(value)
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseSheetDate(value: unknown): Date | null {
  const raw = cell(value);
  if (!raw) return null;

  const ru = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (ru) {
    const day = Number(ru[1]);
    const month = Number(ru[2]);
    const year = Number(ru[3]);
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSheetDate(value: Date | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function rowToMap(headers: string[], row: unknown[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((header, index) => {
    if (!header) return;
    map[normalizeHeader(header)] = cell(row[index]);
  });
  return map;
}

export function pickField(map: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = map[normalizeHeader(key)];
    if (value) return value;
  }
  return "";
}

export function parseOptionalInt(value: unknown): number | null {
  const raw = cell(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
