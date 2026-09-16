import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfDay,
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  getQuarter,
  getYear,
  isWeekend,
  max,
  min,
  startOfDay,
  startOfISOWeek,
} from "date-fns";
import { Prisma } from "@prisma/client";
import { yearBounds } from "@/lib/year-filter";
import { prisma } from "@/lib/prisma";

export function calendarDaysBetween(start: Date, end: Date): number {
  return differenceInCalendarDays(endOfDay(end), startOfDay(start)) + 1;
}

export function workingDaysBetween(start: Date, end: Date): number {
  const days = eachDayOfInterval({ start: startOfDay(start), end: startOfDay(end) });
  return days.filter((d) => !isWeekend(d)).length;
}

export async function listEmployees(includeInactive = false) {
  return prisma.employee.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { fullName: "asc" }],
  });
}

export async function createEmployee(input: {
  fullName: string;
  role: string;
  sortOrder?: number;
}) {
  return prisma.employee.create({
    data: {
      fullName: input.fullName.trim(),
      role: input.role.trim(),
      active: true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateEmployee(
  id: string,
  input: { fullName: string; role: string; active: boolean; sortOrder?: number },
) {
  return prisma.employee.update({
    where: { id },
    data: {
      fullName: input.fullName.trim(),
      role: input.role.trim(),
      active: input.active,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function deleteEmployee(id: string) {
  return prisma.employee.delete({ where: { id } });
}

export type LeaveRow = {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  startDate: Date;
  endDate: Date;
  calendarDays: number;
  workingDays: number;
  leaveType: string;
  status: string;
  substitute: string | null;
  comment: string | null;
  control: string | null;
  year: number;
  quarter: number;
};

function toLeaveRow(leave: {
  id: string;
  employeeId: string;
  startDate: Date;
  endDate: Date;
  calendarDays: number;
  workingDays: number;
  leaveType: string;
  status: string;
  substitute: string | null;
  comment: string | null;
  control: string | null;
  employee: { fullName: string; role: string };
}): LeaveRow {
  return {
    id: leave.id,
    employeeId: leave.employeeId,
    employeeName: leave.employee.fullName,
    role: leave.employee.role,
    startDate: leave.startDate,
    endDate: leave.endDate,
    calendarDays: leave.calendarDays,
    workingDays: leave.workingDays,
    leaveType: leave.leaveType,
    status: leave.status,
    substitute: leave.substitute,
    comment: leave.comment,
    control: leave.control,
    year: getYear(leave.startDate),
    quarter: getQuarter(leave.startDate),
  };
}

export async function listVacationLeaves(filters: { year?: number } = {}): Promise<LeaveRow[]> {
  const where: Prisma.VacationLeaveWhereInput = {};
  if (filters.year) {
    const { from, to } = yearBounds(filters.year);
    where.AND = [{ startDate: { lte: to } }, { endDate: { gte: from } }];
  }

  const leaves = await prisma.vacationLeave.findMany({
    where,
    include: { employee: true },
    orderBy: [{ startDate: "asc" }],
  });
  return leaves.map(toLeaveRow);
}

export type LeaveInput = {
  employeeId: string;
  startDate: Date;
  endDate: Date;
  leaveType?: string;
  status?: string;
  substitute?: string;
  comment?: string;
  control?: string;
};

function leaveData(input: LeaveInput) {
  const startDate = startOfDay(input.startDate);
  const endDate = startOfDay(input.endDate);
  return {
    employeeId: input.employeeId,
    startDate,
    endDate,
    calendarDays: calendarDaysBetween(startDate, endDate),
    workingDays: workingDaysBetween(startDate, endDate),
    leaveType: (input.leaveType ?? "Основной отпуск").trim() || "Основной отпуск",
    status: (input.status ?? "План").trim() || "План",
    substitute: input.substitute?.trim() || null,
    comment: input.comment?.trim() || null,
    control: input.control?.trim() || null,
  };
}

export async function createVacationLeave(input: LeaveInput) {
  return prisma.vacationLeave.create({ data: leaveData(input) });
}

export async function updateVacationLeave(id: string, input: LeaveInput) {
  return prisma.vacationLeave.update({ where: { id }, data: leaveData(input) });
}

export async function deleteVacationLeave(id: string) {
  return prisma.vacationLeave.delete({ where: { id } });
}

export type CalendarWeek = {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  absentCount: number;
  absentEmployeeIds: string[];
};

export type VacationCalendar = {
  year: number;
  employees: { id: string; fullName: string; role: string }[];
  weeks: CalendarWeek[];
  /** employeeId -> week keys yyyy-MM-dd */
  marks: Record<string, string[]>;
};

function weekKey(d: Date): string {
  return format(startOfISOWeek(d), "yyyy-MM-dd");
}

export async function getVacationCalendar(year: number): Promise<VacationCalendar> {
  const employees = await listEmployees(false);
  const yearStart = startOfISOWeek(new Date(year, 0, 4)); // week containing Jan 4
  const yearEnd = endOfISOWeek(new Date(year, 11, 28));

  const leaves = await prisma.vacationLeave.findMany({
    where: {
      startDate: { lte: yearEnd },
      endDate: { gte: yearStart },
    },
  });

  const marks: Record<string, string[]> = {};
  for (const emp of employees) {
    marks[emp.id] = [];
  }

  const weeks: CalendarWeek[] = [];
  let cursor = yearStart;
  while (cursor <= yearEnd) {
    const weekStart = startOfISOWeek(cursor);
    const weekEnd = endOfISOWeek(cursor);
    if (getISOWeekYear(weekStart) === year) {
      const key = weekKey(weekStart);
      const absentEmployeeIds: string[] = [];

      for (const leave of leaves) {
        const overlapStart = max([weekStart, startOfDay(leave.startDate)]);
        const overlapEnd = min([weekEnd, startOfDay(leave.endDate)]);
        if (overlapStart <= overlapEnd) {
          if (!absentEmployeeIds.includes(leave.employeeId)) {
            absentEmployeeIds.push(leave.employeeId);
          }
          if (marks[leave.employeeId] && !marks[leave.employeeId].includes(key)) {
            marks[leave.employeeId].push(key);
          }
        }
      }

      weeks.push({
        weekStart,
        weekEnd,
        label: `${format(weekStart, "dd.MM")}–${format(weekEnd, "dd.MM")}`,
        absentCount: absentEmployeeIds.length,
        absentEmployeeIds,
      });
    }
    cursor = addWeeks(cursor, 1);
    if (weeks.length > 60) break;
  }

  return {
    year,
    employees: employees.map((e) => ({
      id: e.id,
      fullName: e.fullName,
      role: e.role,
    })),
    weeks,
    marks,
  };
}

export type YearDayCell = {
  date: string;
  isoWeek: number;
  weekday: number; // 0 = Mon … 6 = Sun
  month: number; // 1-12
  count: number;
  people: { id: string; name: string; leaveType: string; status: string }[];
};

export type YearHeatmap = {
  year: number;
  days: YearDayCell[];
  /** week column index 0..n -> first date of that column (Mon) */
  weekStarts: string[];
  /** month bands spanning week columns for header */
  monthBands: { month: number; label: string; startWeek: number; endWeek: number }[];
  today: string | null;
};

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export async function getYearDayHeatmap(year: number): Promise<YearHeatmap> {
  const yearStart = startOfDay(new Date(year, 0, 1));
  const yearEnd = startOfDay(new Date(year, 11, 31));
  const gridStart = startOfISOWeek(yearStart);
  const gridEnd = endOfISOWeek(yearEnd);

  const [employees, leaves] = await Promise.all([
    listEmployees(false),
    prisma.vacationLeave.findMany({
      where: {
        startDate: { lte: gridEnd },
        endDate: { gte: gridStart },
      },
      include: { employee: { select: { id: true, fullName: true } } },
    }),
  ]);

  const empMap = new Map(employees.map((e) => [e.id, e.fullName]));
  const days: YearDayCell[] = [];
  const weekStarts: string[] = [];

  let cursor = gridStart;
  let weekIndex = -1;

  while (cursor <= gridEnd) {
    const weekStart = startOfISOWeek(cursor);
    const weekStartKey = format(weekStart, "yyyy-MM-dd");
    if (weekStarts[weekStarts.length - 1] !== weekStartKey) {
      weekIndex += 1;
      weekStarts.push(weekStartKey);
    }

    const inYear = getYear(cursor) === year;
    const dateKey = format(cursor, "yyyy-MM-dd");
    const people: YearDayCell["people"] = [];

    if (inYear) {
      for (const leave of leaves) {
        const s = startOfDay(leave.startDate);
        const e = startOfDay(leave.endDate);
        if (cursor >= s && cursor <= e) {
          people.push({
            id: leave.employeeId,
            name: leave.employee.fullName || empMap.get(leave.employeeId) || "—",
            leaveType: leave.leaveType,
            status: leave.status,
          });
        }
      }
    }

    const jsDay = cursor.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;

    days.push({
      date: dateKey,
      isoWeek: getISOWeek(cursor),
      weekday,
      month: cursor.getMonth() + 1,
      count: inYear ? people.length : -1,
      people,
    });

    cursor = addDays(cursor, 1);
    if (days.length > 400) break;
  }

  const monthBands: YearHeatmap["monthBands"] = [];
  const weekMonth: number[] = [];
  for (let wi = 0; wi < weekStarts.length; wi += 1) {
    const slice = days.slice(wi * 7, wi * 7 + 7).filter((d) => d.count >= 0);
    if (slice.length === 0) {
      weekMonth.push(0);
      continue;
    }
    const tally = new Map<number, number>();
    for (const d of slice) tally.set(d.month, (tally.get(d.month) ?? 0) + 1);
    let best = slice[0].month;
    let bestN = 0;
    for (const [m, n] of tally) {
      if (n > bestN) {
        best = m;
        bestN = n;
      }
    }
    weekMonth.push(best);
  }

  let bandStart = 0;
  while (bandStart < weekMonth.length) {
    const month = weekMonth[bandStart];
    if (!month) {
      bandStart += 1;
      continue;
    }
    let bandEnd = bandStart;
    while (bandEnd + 1 < weekMonth.length && weekMonth[bandEnd + 1] === month) {
      bandEnd += 1;
    }
    monthBands.push({
      month,
      label: MONTHS_RU[month - 1],
      startWeek: bandStart,
      endWeek: bandEnd,
    });
    bandStart = bandEnd + 1;
  }

  const now = new Date();
  const today =
    now.getFullYear() === year
      ? format(startOfDay(now), "yyyy-MM-dd")
      : null;

  return { year, days, weekStarts, monthBands, today };
}

export { addWeeks, format, getISOWeek, startOfISOWeek, endOfISOWeek, weekKey };
