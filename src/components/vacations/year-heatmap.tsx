"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createVacationLeaveAction } from "@/app/actions";
import { runWithToast } from "@/lib/action-feedback";
import { CollapsibleFormPanel } from "@/components/ui";
import type { YearDayCell, YearHeatmap } from "@/modules/vacations/service";

const LEAVE_TYPES = ["Основной отпуск", "Отгул", "Больничный", "Без содержания"];
const STATUSES = ["План", "Согласовано", "Использован", "Отменён"];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function levelClass(count: number): string {
  if (count < 0) return "yh-empty";
  if (count === 0) return "yh-l0";
  if (count === 1) return "yh-l1";
  if (count === 2) return "yh-l2";
  if (count === 3) return "yh-l3";
  return "yh-l4";
}

function parseDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatRu(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "short",
  }).format(parseDay(iso));
}

function daysBetweenInclusive(a: string, b: string) {
  const start = parseDay(a <= b ? a : b);
  const end = parseDay(a <= b ? b : a);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

type EmployeeOpt = { id: string; fullName: string; role: string };

export function YearHeatmapEditor({
  heatmap,
  employees,
  editable,
}: {
  heatmap: YearHeatmap;
  employees: EmployeeOpt[];
  editable: boolean;
}) {
  const router = useRouter();
  const initialDay = heatmap.today;
  const [hover, setHover] = useState<YearDayCell | null>(() => {
    if (!initialDay) return null;
    return heatmap.days.find((d) => d.date === initialDay) ?? null;
  });
  const [anchor, setAnchor] = useState<string | null>(initialDay);
  const [rangeEnd, setRangeEnd] = useState<string | null>(initialDay);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  const weeks = useMemo(() => {
    const cols: YearDayCell[][] = [];
    for (let i = 0; i < heatmap.days.length; i += 7) {
      cols.push(heatmap.days.slice(i, i + 7));
    }
    return cols;
  }, [heatmap.days]);

  const colTemplate = useMemo(
    () => `2.5rem repeat(${weeks.length}, minmax(0, 1fr))`,
    [weeks.length],
  );

  const selection = useMemo(() => {
    if (!anchor) return null;
    const end = rangeEnd ?? anchor;
    const start = anchor <= end ? anchor : end;
    const finish = anchor <= end ? end : anchor;
    return { start, end: finish, days: daysBetweenInclusive(start, finish) };
  }, [anchor, rangeEnd]);

  useEffect(() => {
    function up() {
      setDragging(false);
    }
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  function isSelected(date: string, count: number) {
    if (count < 0 || !selection) return false;
    return date >= selection.start && date <= selection.end;
  }

  function onDayDown(day: YearDayCell) {
    if (!editable || day.count < 0) return;
    setDragging(true);
    setAnchor(day.date);
    setRangeEnd(day.date);
    setHover(day);
  }

  function onDayEnter(day: YearDayCell) {
    if (day.count >= 0) setHover(day);
    else setHover(null);
    if (dragging && editable && day.count >= 0) setRangeEnd(day.date);
  }

  function clearSelection() {
    if (heatmap.today) {
      setAnchor(heatmap.today);
      setRangeEnd(heatmap.today);
      setHover(heatmap.days.find((d) => d.date === heatmap.today) ?? null);
    } else {
      setAnchor(null);
      setRangeEnd(null);
    }
    setDragging(false);
  }

  function submitLeave(formData: FormData) {
    if (!selection) return;
    startTransition(async () => {
      await runWithToast(
        async () => {
          await createVacationLeaveAction(formData);
          clearSelection();
          router.refresh();
        },
        { success: "Отпуск назначен", error: "Не удалось назначить отпуск" },
      );
    });
  }

  return (
    <div className="yh-wrap">
      <div className="yh-main">
        <div className="yh-head">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">Год {heatmap.year}</h2>
            <p className="text-sm text-[var(--muted)]">
              {editable
                ? "Сегодня уже выбрано. Протяните мышью, чтобы выбрать период, справа укажите сотрудника."
                : "Наведите на день — кто отсутствует."}
            </p>
          </div>
          <div className="yh-legend">
            <span className="text-xs text-[var(--muted)]">Меньше</span>
            <span className="yh-swatch yh-l0" />
            <span className="yh-swatch yh-l1" />
            <span className="yh-swatch yh-l2" />
            <span className="yh-swatch yh-l3" />
            <span className="yh-swatch yh-l4" />
            <span className="text-xs text-[var(--muted)]">Больше</span>
          </div>
        </div>

        <div className="yh-board panel">
          <div className="yh-months" style={{ gridTemplateColumns: colTemplate }}>
            <span className="yh-months-spacer" />
            {heatmap.monthBands.map((band) => (
              <div
                key={band.month}
                className="yh-month-band"
                style={{
                  gridColumn: `${band.startWeek + 2} / ${band.endWeek + 3}`,
                }}
              >
                <span className="yh-month-label">{band.label}</span>
              </div>
            ))}
          </div>

          <div
            className="yh-grid"
            style={{ gridTemplateColumns: colTemplate }}
            onMouseLeave={() => {
              if (!dragging) {
                const keepDate = selection?.start;
                const keep = keepDate
                  ? heatmap.days.find((d) => d.date === keepDate) ?? null
                  : null;
                setHover(keep);
              }
            }}
          >
            {WEEKDAYS.map((label, row) => (
              <div key={`wd-${row}`} className="contents">
                <span className="yh-wd">{label}</span>
                {weeks.map((col, wi) => {
                  const day = col[row];
                  if (!day) {
                    return <span key={`gap-${wi}-${row}`} className="yh-cell yh-empty" />;
                  }
                  const selected = isSelected(day.date, day.count);
                  const isToday = heatmap.today === day.date;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      aria-label={day.count < 0 ? undefined : formatRu(day.date)}
                      className={`yh-cell ${levelClass(day.count)} ${selected ? "yh-selected" : ""} ${isToday ? "yh-today" : ""}`}
                      disabled={day.count < 0}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onDayDown(day);
                      }}
                      onMouseEnter={() => onDayEnter(day)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="yh-side">
        <div className="panel yh-tooltip min-h-28">
          {hover && hover.count >= 0 ? (
            <>
              <p className="font-medium text-[var(--ink)]">
                {formatRu(hover.date)}
                {heatmap.today === hover.date ? (
                  <span className="yh-today-tag"> сегодня</span>
                ) : null}
              </p>
              {hover.people.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--muted)]">Никого нет в отпуске</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {hover.people.map((p, idx) => (
                    <li key={`${hover.date}-${p.id}-${idx}`} className="text-sm">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-[var(--muted)]">
                        {" "}
                        · {p.leaveType} · {p.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">Наведите на день</p>
          )}
        </div>

        {editable ? (
          <CollapsibleFormPanel title="Назначить отпуск">
            {selection ? (
              <p className="text-sm text-[var(--muted)]">
                Выбрано:{" "}
                <span className="font-medium text-[var(--ink)]">
                  {formatRu(selection.start)}
                  {selection.start !== selection.end ? ` — ${formatRu(selection.end)}` : ""}
                </span>
                <br />
                {selection.days} календарных дн.
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)]">Выделите дни на сетке мышью</p>
            )}

            {employees.length === 0 ? (
              <p className="text-sm text-[var(--negative)]">
                Сначала добавьте людей во вкладке «Сотрудники» — оттуда берётся список для
                назначения.
              </p>
            ) : (
              <form action={submitLeave} className="grid gap-2">
                <input type="hidden" name="startDate" value={selection?.start ?? ""} />
                <input type="hidden" name="endDate" value={selection?.end ?? ""} />
                <label className="text-xs text-[var(--muted)]">Сотрудник</label>
                <select
                  className="field"
                  name="employeeId"
                  required
                  defaultValue=""
                  disabled={!selection}
                >
                  <option value="" disabled>
                    Выберите из сотрудников
                  </option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                      {e.role ? ` · ${e.role}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  className="field"
                  name="leaveType"
                  list="yh-leave-types"
                  defaultValue="Основной отпуск"
                  disabled={!selection}
                />
                <datalist id="yh-leave-types">
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <input
                  className="field"
                  name="status"
                  list="yh-leave-statuses"
                  defaultValue="План"
                  disabled={!selection}
                />
                <datalist id="yh-leave-statuses">
                  {STATUSES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <input
                  className="field"
                  name="substitute"
                  placeholder="Кто заменяет"
                  disabled={!selection}
                />
                <input
                  className="field"
                  name="comment"
                  placeholder="Комментарий"
                  disabled={!selection}
                />
                <input className="field" name="control" placeholder="Контроль" disabled={!selection} />
                <div className="flex flex-wrap gap-2">
                  <button className="btn" type="submit" disabled={!selection || pending}>
                    {pending ? "Сохраняю…" : "Добавить отпуск"}
                  </button>
                  <button className="btn-ghost" type="button" onClick={clearSelection}>
                    К сегодня
                  </button>
                </div>
              </form>
            )}
          </CollapsibleFormPanel>
        ) : null}
      </aside>
    </div>
  );
}
