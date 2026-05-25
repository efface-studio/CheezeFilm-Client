import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { serverClient, type Audition } from "@/lib/db";
import { listingSummary } from "@/lib/auditionListings";
import { batchResolveAuditionPhotos } from "@/lib/auditionPhoto";
import AutoPrint from "../../AutoPrint";
import PrintButton from "../../PrintButton";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "오디션 명단 인쇄 | 치즈필름",
  robots: { index: false, follow: false, nocache: true },
};

const ROLE_KO: Record<string, string> = {
  lead: "주연",
  support: "조연",
  extra: "단역",
  staff: "스태프",
};
const GENDER_KO: Record<string, string> = {
  female: "여성",
  male: "남성",
  other: "기타",
};
const STATUS_KO: Record<Audition["status"], string> = {
  pending: "대기",
  reviewing: "검토중",
  accepted: "합격",
  rejected: "불합격",
};

function formatDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/**
 * Print-friendly applicant roster. Renders as a styled HTML page that the
 * browser can save as PDF — no PDF library on the server, we rely on the
 * browser's print → "Save as PDF" pipeline which gives perfect Korean
 * font support via the user's system fonts.
 *
 * Linked from the admin toolbar's export menu; opens in a new tab and
 * auto-pops the print dialog on load (see <AutoPrint />).
 */
export default async function PrintPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const sb = serverClient();
  const { data: rowsData } = await sb
    .from("auditions")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (rowsData ?? []) as Audition[];

  // Pre-resolve listing summaries + photo URLs in parallel. Previously
  // the listing lookups ran sequentially in a for-loop (one Supabase
  // round-trip each), and photos were left as raw bucket keys — which
  // made the print preview show a broken image for every applicant
  // since the auditions bucket is private. Both fixed in one pass:
  //   - dedupe listing IDs then Promise.all over the unique set
  //   - batch signed-URL mint for every photo
  const uniqueListingIds = Array.from(
    new Set(rows.map((a) => a.listing_id).filter((id): id is number => id != null)),
  );
  const [listingSummaryEntries, photoUrls] = await Promise.all([
    Promise.all(
      uniqueListingIds.map(async (id) => [id, await listingSummary(id)] as const),
    ),
    batchResolveAuditionPhotos(
      rows.map((a) => ({ id: a.id, photo_url: a.photo_url })),
    ),
  ]);
  const listingSummaries = new Map<number, string>(
    listingSummaryEntries.filter(([, s]) => !!s) as [number, string][],
  );
  const today = new Date();
  const printDate = formatDate(today.toISOString());

  return (
    <div className="print-root font-pretendard">
      <PrintPageStyles />
      <AutoPrint />

      <header className="print-header">
        <div>
          <div className="print-eyebrow">CHEEZEFILM — CASTING ROSTER</div>
          <h1>오디션 지원자 명단</h1>
          <p className="print-meta">
            인쇄일 {printDate} · 총 {rows.length}명
          </p>
        </div>
        <PrintButton />
      </header>

      <table className="print-table">
        <thead>
          <tr>
            <th style={{ width: "4%" }}>ID</th>
            <th style={{ width: "8%" }}>사진</th>
            <th style={{ width: "10%" }}>이름</th>
            <th style={{ width: "7%" }}>나이·성별</th>
            <th style={{ width: "12%" }}>연락처</th>
            <th style={{ width: "6%" }}>포지션</th>
            <th style={{ width: "15%" }}>지원 공고</th>
            <th style={{ width: "22%" }}>자기소개 (요약)</th>
            <th style={{ width: "6%" }}>상태</th>
            <th style={{ width: "7%" }}>제출일</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="mono">#{String(a.id).padStart(4, "0")}</td>
              <td>
                {/* Use the pre-signed URL (private bucket) rather than
                    the raw key. Falls back to the initial-letter tile
                    when nothing is uploaded or the signed-URL mint
                    failed during the page render. */}
                {photoUrls.get(a.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photoUrls.get(a.id)!}
                    alt={a.name}
                    className="thumb"
                  />
                ) : (
                  <div className="thumb-empty" aria-hidden>
                    {a.name.charAt(0)}
                  </div>
                )}
              </td>
              <td>
                <strong>{a.name}</strong>
                <div className="sub">{a.email}</div>
              </td>
              <td>
                {[a.age ? `${a.age}세` : null, a.gender ? GENDER_KO[a.gender] : null]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </td>
              <td className="mono">{a.phone ?? "—"}</td>
              <td>
                {a.role_preference ? ROLE_KO[a.role_preference] ?? a.role_preference : "—"}
              </td>
              <td className="break">{a.listing_id != null ? listingSummaries.get(a.listing_id) ?? "—" : "—"}</td>
              <td className="break">
                {a.intro.length > 120 ? a.intro.slice(0, 120) + "…" : a.intro}
              </td>
              <td>
                <span className={`status status-${a.status}`}>
                  {STATUS_KO[a.status]}
                </span>
              </td>
              <td className="mono">{formatDate(a.created_at)}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="empty">
                접수된 지원이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <footer className="print-footer">
        치즈필름 캐스팅 부서 — 본 명단은 내부 검토용입니다.
      </footer>
    </div>
  );
}

/**
 * Styles for the print page — Pretendard import, page setup, table styling,
 * plus rules that hide globally-injected chrome (cursor spotlight overlay,
 * page vignette) so the print preview stays clean.
 */
function PrintPageStyles() {
  return (
    <style>{`
      @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
      @page { size: A4 landscape; margin: 14mm; }
      body.vignette::before, body.vignette::after { display: none !important; }
      body > .fixed.inset-0 { display: none !important; }
      body { background: white !important; }
      .print-root { padding: 24px 32px; color: #18181b; max-width: none; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
      .print-root * { box-sizing: border-box; }
      .print-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid #18181b; margin-bottom: 18px; }
      .print-header h1 { font-size: 28px; font-weight: 800; margin: 4px 0 0; letter-spacing: -0.02em; }
      .print-eyebrow { font-size: 10px; letter-spacing: 0.3em; font-weight: 700; color: #7c3aed; text-transform: uppercase; }
      .print-meta { font-size: 12px; color: #71717a; margin: 6px 0 0; }
      .print-table { width: 100%; border-collapse: collapse; font-size: 11px; }
      .print-table th, .print-table td { border-bottom: 1px solid #e4e4e7; padding: 8px 8px; vertical-align: top; text-align: left; }
      .print-table th { background: #f4f4f5; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; color: #52525b; text-transform: uppercase; }
      .print-table td.mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; color: #52525b; font-variant-numeric: tabular-nums; }
      .print-table td .sub { font-size: 10px; color: #71717a; font-weight: 400; margin-top: 2px; }
      .print-table td.break { word-break: break-word; line-height: 1.45; }
      .print-table .thumb { width: 56px; height: 70px; object-fit: cover; border-radius: 4px; border: 1px solid #e4e4e7; display: block; }
      .print-table .thumb-empty { width: 56px; height: 70px; border-radius: 4px; border: 1px solid #e4e4e7; background: #f4f4f5; display: grid; place-items: center; font-weight: 700; color: #a1a1aa; font-size: 18px; }
      .print-table tbody td { vertical-align: middle; }
      .print-table tbody tr:nth-child(even) td { background: #fafafa; }
      .empty { text-align: center; padding: 40px 0 !important; color: #a1a1aa; font-style: italic; }
      .status { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
      .status-pending { background: #f4f4f5; color: #52525b; }
      .status-reviewing { background: #fef3c7; color: #92400e; }
      .status-accepted { background: #d1fae5; color: #065f46; }
      .status-rejected { background: #fee2e2; color: #991b1b; }
      .print-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e4e4e7; font-size: 10px; color: #a1a1aa; text-align: center; }
      @media print {
        .no-print { display: none !important; }
        .print-root { padding: 0; }
        .print-table tbody tr { page-break-inside: avoid; }
      }
    `}</style>
  );
}
