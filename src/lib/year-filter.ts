export function parseYearParam(value?: string | null): number | undefined {
  if (value == null || value.trim() === "") return undefined;
  const year = Number(value);
  return Number.isFinite(year) && year > 1900 ? year : undefined;
}

export function yearFilterOptions(anchorYear = new Date().getFullYear()): number[] {
  return [anchorYear - 2, anchorYear - 1, anchorYear, anchorYear + 1];
}

export function yearBounds(year: number) {
  return {
    from: new Date(year, 0, 1),
    to: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}
