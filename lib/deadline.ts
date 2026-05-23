/**
 * Pure helpers for the audition-listing `deadline` field. No DB imports
 * so this module is safe to import from client components.
 *
 * The deadline column accepts two ISO-shaped formats — both treated as
 * LOCAL time (the studio runs on KST):
 *
 * - `YYYY-MM-DD`           — legacy / date-only.
 * - `YYYY-MM-DDTHH:MM`     — datetime with hour/minute precision.
 */

/**
 * Parse a deadline string to a comparable epoch millisecond.
 *
 * Date-only values are interpreted as end-of-day 23:59:59 local so
 * "the 23rd is the deadline" includes the entire day of the 23rd.
 * Datetime values are taken literally. Empty / unparseable input → null
 * (callers treat null as "no deadline set").
 */
export function parseDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      23, 59, 59,
    ).getTime();
  }
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(deadline);
  if (dateTime) {
    return new Date(
      Number(dateTime[1]),
      Number(dateTime[2]) - 1,
      Number(dateTime[3]),
      Number(dateTime[4]),
      Number(dateTime[5]),
    ).getTime();
  }
  const t = new Date(deadline).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * Render a deadline for display. Datetime → "2026-05-23 18:00",
 * date-only → "2026-05-23", everything else passes through.
 */
export function formatDeadline(deadline: string | null): string {
  if (!deadline) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline;
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(deadline);
  if (m) return `${m[1]} ${m[2]}`;
  return deadline;
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Editorial / Korean-flavored deadline format for public-facing UI.
 * Datetime → "5월 28일 (목) 03:00", date-only → "5월 28일 (목)".
 * Falls back to the raw string for anything unparseable.
 */
export function formatDeadlineLong(deadline: string | null): string {
  if (!deadline) return "";
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(deadline);
  const m = dateOnly ?? dateTime;
  if (!m) return deadline;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dow = WEEKDAY_KO[new Date(y, mo - 1, d).getDay()];
  const base = `${mo}월 ${d}일 (${dow})`;
  if (dateTime) return `${base} ${m[4]}:${m[5]}`;
  return base;
}
