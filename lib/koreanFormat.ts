/**
 * Korean-form input formatters + light validators. Pure functions —
 * safe to import from client components and edge runtime.
 */

// ── 전화번호 ─────────────────────────────────────────

/**
 * `01028492919` → `010-2849-2919`
 * `010-1234-567` → `010-1234-567` (incomplete, no auto-pad)
 *
 * Pure progressive dash-formatter — does NOT force the 010 prefix while
 * the user is typing (forcing it produces confusing edits when the user
 * accidentally types `011` and watches digits rearrange). Submit-time
 * validation enforces 010 only via `isValidKoreanPhone`.
 */
export function formatKoreanPhone(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** Returns true only for a fully-formed 010-NNNN-NNNN. */
export function isValidKoreanPhone(s: string): boolean {
  return /^010-\d{4}-\d{4}$/.test(s);
}

// ── 생년월일 ─────────────────────────────────────────

/**
 * `19950515` → `1995-05-15`
 * `1995051` → `1995-05-1`
 *
 * Pure formatter — does no calendar validation. The submission API
 * rejects impossible dates server-side via `Date.parse`.
 */
export function formatBirthdate(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** Strict ISO-date check + sanity bounds (1900-current year). */
export function isValidBirthdate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const now = new Date();
  if (y < 1900 || y > now.getFullYear()) return false;
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > 31) return false;
  const date = new Date(y, mo - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === mo - 1 &&
    date.getDate() === d
  );
}

/** Korean 만 나이 — age in completed years from birthdate to today. */
export function computeAgeFromBirthdate(s: string): number | null {
  if (!isValidBirthdate(s)) return null;
  const [yStr, mStr, dStr] = s.split("-");
  const birth = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}
