/**
 * Admin audit logging.
 *
 * Lightweight wrapper around `console.info` — Vercel's runtime captures
 * stdout and exposes it via the dashboard's "Logs" view, which is the
 * audit trail we use for now. Single-line, key=value format so each
 * record is greppable and structured-log-tooling-friendly without
 * pulling in a logger dependency.
 *
 * Every destructive admin action (PATCH/DELETE on auditions, listings,
 * fan messages, members, covers) calls this. The trail lets the team
 * answer "who deleted audition #142 last Tuesday" without forensics.
 *
 * NOT for permission decisions — this is a passive record. The actual
 * authZ check (`getSession()` + admin-only routes) must happen
 * independently before we ever reach this call.
 */
export function auditLog(opts: {
  action: "create" | "update" | "delete" | "login" | "logout";
  resource: string;
  id: string | number;
  username: string;
  /** Optional extra context (status transitions, IP, etc.) */
  meta?: Record<string, string | number | boolean | null | undefined>;
}): void {
  const parts: string[] = [
    `[AUDIT]`,
    `ts=${new Date().toISOString()}`,
    `user=${opts.username}`,
    `action=${opts.action}`,
    `resource=${opts.resource}`,
    `id=${opts.id}`,
  ];
  if (opts.meta) {
    for (const [k, v] of Object.entries(opts.meta)) {
      if (v === undefined || v === null) continue;
      // Quote any value containing whitespace so a downstream parser
      // can tokenise on space safely.
      const raw = String(v);
      parts.push(`${k}=${/\s/.test(raw) ? `"${raw.replace(/"/g, '\\"')}"` : raw}`);
    }
  }
  console.info(parts.join(" "));
}
