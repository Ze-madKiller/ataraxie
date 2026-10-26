import { parseSemester } from "./semesters";

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number] | null;

export interface StatsFilters {
  /** Number of days back, or null for all time. */
  days: Period;
  semester: number | null;
}

/** Reads ?periode=7|30|90|tout and ?semestre=1..12 from the URL. Defaults to the last 30 days. */
export function parseStatsFilters(params: { periode?: string; semestre?: string }): StatsFilters {
  const raw = params.periode;
  const days = raw === "tout" ? null : (PERIODS.find((p) => String(p) === raw) ?? 30);
  return { days, semester: parseSemester(params.semestre) };
}

/** Start of the period; the epoch for "all time". */
export function periodStart(days: Period, now: Date = new Date()): Date {
  if (days === null) return new Date(0);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** Success rate in percent, or null when there is nothing to measure. */
export function successRate(correct: number, total: number): number | null {
  return total > 0 ? Math.round((correct / total) * 100) : null;
}

export interface DayRow {
  day: string; // YYYY-MM-DD
  answers: number;
  correct: number;
  students: number;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** One row per day for the last `days` days (oldest first), with zeros for days without answers. */
export function fillDays(rows: DayRow[], days: number, now: Date = new Date()): DayRow[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const result: DayRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = isoDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
    result.push(byDay.get(day) ?? { day, answers: 0, correct: 0, students: 0 });
  }
  return result;
}
