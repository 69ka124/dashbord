import { yearFilterOptions } from "@/lib/year-filter";

type YearFilterSelectProps = {
  name?: string;
  value?: number;
  className?: string;
  label?: string;
  showAll?: boolean;
};

export function YearFilterSelect({
  name = "year",
  value,
  className = "field w-auto",
  label,
  showAll = true,
}: YearFilterSelectProps) {
  const years = yearFilterOptions(value ?? new Date().getFullYear());

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
      {label ? <span>{label}</span> : null}
      <select className={className} name={name} defaultValue={value ?? ""} aria-label="Год">
        {showAll ? <option value="">Все время</option> : null}
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
