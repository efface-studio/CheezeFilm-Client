/**
 * Shared admin UI primitives.
 *
 * Centralizes the visual vocabulary used by every tab — the previous
 * setup duplicated `PageHeader`, status pills, and KPI tiles in three
 * different places (page.tsx, ListingsCrud, MembersCrud) which made it
 * impossible to nudge the look without grep-edits. Everything here is
 * pure / unstyled-once / Korean-label-agnostic so a tab can drop it in.
 *
 * Naming: stay on `Pill`, `Tile`, `Header` — feels like a real admin
 * library (Linear / Stripe) rather than marketing site components.
 */
import Link from "next/link";

// ───── Status / pill ──────────────────────────────────────────────

export type AuditionStatus = "pending" | "reviewing" | "accepted" | "rejected";

const STATUS_PILL_KO: Record<AuditionStatus, string> = {
  pending: "대기",
  reviewing: "검토중",
  accepted: "합격",
  rejected: "불합격",
};

/**
 * Color recipes mirror common admin conventions:
 *   - pending  → neutral zinc (default / no action yet)
 *   - reviewing → amber (in progress, attention)
 *   - accepted → emerald (success)
 *   - rejected → rose (terminal negative)
 * Each pill also gets a 1.5px dot so the color carries even when
 * skimming at a distance.
 */
const STATUS_PILL_TONES: Record<AuditionStatus, { bg: string; text: string; dot: string }> = {
  pending: { bg: "bg-zinc-100", text: "text-zinc-700", dot: "bg-zinc-400" },
  reviewing: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  accepted: { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
  rejected: { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-500" },
};

export function StatusPill({ status }: { status: AuditionStatus }) {
  const tone = STATUS_PILL_TONES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-md ${tone.bg} ${tone.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {STATUS_PILL_KO[status]}
    </span>
  );
}

// ───── Page header ────────────────────────────────────────────────

/**
 * Page-level header that lives at the top of every tab body.
 *
 * Title and subtitle are the same vocabulary as `SectionHeader` in
 * page.tsx (which we keep for inline sub-sections) but with a
 * right-aligned action slot so things like "Export CSV" or "+ New"
 * land in the right spot without each tab reinventing flexbox.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-5 mb-6 border-b border-zinc-200">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-zinc-500 mt-1.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

// ───── KPI tile ───────────────────────────────────────────────────

/**
 * Dashboard KPI tile — designed denser than the previous KpiCard. The
 * previous version felt like a marketing stat block (large pad, large
 * type); this one reads more like a Linear / Stripe stat tile —
 * tighter, with an optional 7-day delta chip on the right.
 */
export function KpiTile({
  label,
  value,
  hint,
  delta,
  icon,
}: {
  label: string;
  value: number | string;
  hint?: string;
  /** Signed integer for "vs previous period". `null` means hide. */
  delta?: number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3.5 hover:border-zinc-300 transition-colors">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          {label}
        </div>
        {icon && <span className="text-zinc-300">{icon}</span>}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-2xl font-extrabold text-zinc-900 tabular-nums leading-none">
          {value}
        </div>
        {typeof delta === "number" && <DeltaChip delta={delta} />}
      </div>
      {hint && (
        <div className="text-[11px] font-medium text-zinc-400 tabular-nums mt-2">
          {hint}
        </div>
      )}
    </div>
  );
}

function DeltaChip({ delta }: { delta: number }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400 tabular-nums">
        — 0
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
        up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {Math.abs(delta)}
    </span>
  );
}

// ───── Panel ──────────────────────────────────────────────────────

/**
 * Card-shaped section used on the dashboard for "inbox-style" lists
 * (recent auditions / unread messages). Pulled out of page.tsx so the
 * header treatment is the same here as in any future panel.
 */
export function Panel({
  title,
  link,
  children,
  empty,
}: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
  /** Optional empty-state node — shown only when `children` is empty
   *  array / null. We DON'T inspect children deeply; caller can pass
   *  a pre-checked node or use the `EmptyState` primitive directly. */
  empty?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <h3 className="text-[13px] font-bold text-zinc-900">{title}</h3>
        {link && (
          <Link
            href={link.href}
            className="text-[11px] font-bold text-zinc-500 hover:text-zinc-900 transition-colors uppercase tracking-wider"
          >
            {link.label}
          </Link>
        )}
      </div>
      <div className="p-4">{empty ?? children}</div>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center text-sm text-zinc-400">{children}</div>
  );
}

// ───── Tab loading skeleton ───────────────────────────────────────

/**
 * Generic skeleton shown while a `nextDynamic()` chunk is downloading
 * (members / listings / content / cover). The previous setup blanked
 * the area — admins would think the click broke. This matches the
 * eventual layout (toolbar row + 4 list rows) so the transition is
 * almost invisible.
 */
export function TabSkeleton({ kind = "list" }: { kind?: "list" | "grid" | "form" }) {
  if (kind === "form") {
    return (
      <div className="space-y-4 animate-pulse" aria-label="불러오는 중">
        <div className="h-10 bg-zinc-100 rounded-lg w-1/3" />
        <div className="h-32 bg-zinc-100 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 bg-zinc-100 rounded-lg" />
          <div className="h-20 bg-zinc-100 rounded-lg" />
        </div>
      </div>
    );
  }
  if (kind === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse" aria-label="불러오는 중">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[4/3] bg-zinc-100 rounded-lg"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-2 animate-pulse" aria-label="불러오는 중">
      <div className="flex items-center justify-between">
        <div className="h-9 bg-zinc-100 rounded-lg w-64" />
        <div className="h-9 bg-zinc-100 rounded-lg w-28" />
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 bg-white"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-100" />
                <div>
                  <div className="w-32 h-3 rounded bg-zinc-100" />
                  <div className="mt-1.5 w-48 h-2.5 rounded bg-zinc-50" />
                </div>
              </div>
              <div className="w-16 h-6 rounded bg-zinc-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
