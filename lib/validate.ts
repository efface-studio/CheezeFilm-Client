/**
 * Shared input validators.
 *
 * Centralised so every endpoint applies the same rules — previously each
 * route inlined its own regexes and `URL`-parsing logic, which is how
 * inconsistencies (and gaps) creep in.
 */

/**
 * Email validator — stricter than the previous `^[^\s@]+@[^\s@]+\.[^\s@]+$`
 * which accepted `a@b.c`, consecutive dots, and unreasonable TLDs.
 *
 * The full RFC-5321 grammar is genuinely impractical to validate with a
 * regex (it allows things like `"foo bar"@example.com` and IP-literal
 * domains). This is the "good enough for app-level filtering" subset:
 *   - local part: ASCII printables minus a few separators, no leading /
 *     trailing dot, no consecutive dots
 *   - domain: dot-separated labels, each label 1–63 chars, starts/ends
 *     with alphanumeric, TLD ≥ 2 chars
 *   - total length ≤ 254 chars (RFC 5321 §4.5.3.1.3)
 *
 * Supabase's row-level validation is the second line of defence; this
 * just stops obvious garbage at the API boundary.
 */
const EMAIL_RE =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9._%+-]{1,64}(?<!\.)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/;

export function isEmail(v: string): boolean {
  if (typeof v !== "string") return false;
  if (v.length > 254) return false;
  return EMAIL_RE.test(v);
}

/**
 * Block hostnames that resolve to internal services. We don't actually
 * resolve DNS here — that would be slow and a DNS-rebind attack could
 * race past it anyway — we just check the *literal* hostname for the
 * obvious private/loopback/link-local cases. Combined with the http(s)
 * scheme check, this stops the common SSRF / open-redirect tricks
 * (`http://localhost:3000`, `http://169.254.169.254/latest/meta-data/`).
 */
const PRIVATE_HOST_RE =
  /^(?:localhost|127\.[0-9.]+|::1|0\.0\.0\.0|10\.[0-9.]+|172\.(?:1[6-9]|2[0-9]|3[01])\.[0-9.]+|192\.168\.[0-9.]+|169\.254\.[0-9.]+|fc00:|fd[0-9a-f]{2}:|fe80:)/i;

/**
 * Returns a normalised URL string if `raw` is a safe public http(s) URL,
 * or throws with a user-facing Korean error otherwise.
 *
 * Used for the portfolio URL field on the audition form. Catches:
 *   - `javascript:` / `data:` / other dangerous schemes
 *   - loopback / private IPs (SSRF)
 *   - link-local + cloud-metadata addresses
 *   - missing host (`https:///path`)
 *
 * The returned string is what we store in the DB — `URL` strips redundant
 * default-port suffixes and lowercases the host, which keeps the column
 * tidy.
 */
export function assertSafePublicUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("URL 형식이 올바르지 않습니다.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("URL은 http(s)://로 시작해야 합니다.");
  }
  const host = parsed.hostname;
  if (!host) {
    throw new Error("URL의 도메인이 비어있어요.");
  }
  if (PRIVATE_HOST_RE.test(host)) {
    throw new Error("내부 / 비공개 주소는 사용할 수 없어요.");
  }
  return parsed.toString();
}
