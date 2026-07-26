/* Client-side review cadence: the server stores only completion rows
   (GET /api/reviews/status); this module derives "is a review due" from them
   plus the configured weekly due-day (localStorage). See KTD1. */

export type ReviewCompletion = {
  kind: "weekly" | "monthly" | "quarterly" | string;
  year: number;
  period: number;
  completedAt: string;
};

const DUE_DAY_KEY = "weekly-review-due-day";
export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Configured weekly due-day, 0=Sunday..6=Saturday. Defaults to Sunday. */
export function getWeeklyDueDay(): number {
  try {
    const raw = localStorage.getItem(DUE_DAY_KEY);
    const n = raw != null ? parseInt(raw, 10) : NaN;
    return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 0;
  } catch {
    return 0;
  }
}
export function setWeeklyDueDay(day: number): void {
  try {
    localStorage.setItem(DUE_DAY_KEY, String(day));
  } catch {
    /* ignore */
  }
}

/* ISO week + week-year — identical numbering to the Weekly Review page. */
export function isoWeek(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
}
export function isoWeekYear(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  return target.getFullYear();
}
export function currentQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}
export function currentMonth(date: Date): number {
  return date.getMonth() + 1;
}

export function weeklyPeriod(now: Date = new Date()): { year: number; period: number } {
  return { year: isoWeekYear(now), period: isoWeek(now) };
}
export function quarterlyPeriod(now: Date = new Date()): { year: number; period: number } {
  return { year: now.getFullYear(), period: currentQuarter(now) };
}
export function monthlyPeriod(now: Date = new Date()): { year: number; period: number } {
  return { year: now.getFullYear(), period: currentMonth(now) };
}

function isCompleted(
  completions: ReviewCompletion[],
  kind: string,
  year: number,
  period: number,
): boolean {
  return completions.some((c) => c.kind === kind && c.year === year && c.period === period);
}

/** Weekly review is due once the configured due-day of the current
    (Sunday-first) calendar week has arrived and the current ISO week isn't
    marked complete. Sunday default → due through the week until done. */
export function isWeeklyDue(
  completions: ReviewCompletion[],
  now: Date = new Date(),
  dueDay: number = getWeeklyDueDay(),
): boolean {
  const { year, period } = weeklyPeriod(now);
  if (isCompleted(completions, "weekly", year, period)) return false;
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - now.getDay()); // back to Sunday
  const dueDate = new Date(weekStart);
  dueDate.setDate(weekStart.getDate() + dueDay);
  return now.getTime() >= dueDate.getTime();
}

/** Quarterly review is due from the start of a calendar quarter until the
    current quarter is marked complete. */
export function isQuarterlyDue(
  completions: ReviewCompletion[],
  now: Date = new Date(),
): boolean {
  const { year, period } = quarterlyPeriod(now);
  return !isCompleted(completions, "quarterly", year, period);
}

/** Monthly review is due from the start of a calendar month until the current
    month is marked complete. */
export function isMonthlyDue(
  completions: ReviewCompletion[],
  now: Date = new Date(),
): boolean {
  const { year, period } = monthlyPeriod(now);
  return !isCompleted(completions, "monthly", year, period);
}
