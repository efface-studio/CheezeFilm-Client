import { redirect } from "next/navigation";
import nextDynamic from "next/dynamic";
import { getSession } from "@/lib/auth";
import {
  storageUrl,
  serverClient,
  type Audition,
  type FanMessage,
} from "@/lib/db";
import { getMembers } from "@/lib/members";
import { getAllContent, loadContentMap, getContent } from "@/lib/content";
import { batchResolveAuditionPhotos } from "@/lib/auditionPhoto";
import AdminShell from "./AdminShell";
import AdminActions from "./AdminActions";
import AdminListToolbar from "./AdminListToolbar";
import {
  PageHeader,
  KpiTile,
  Panel,
  EmptyState,
  StatusPill,
  TabSkeleton,
  type AuditionStatus,
} from "./AdminUI";
import { getAllListings, listingSummary } from "@/lib/auditionListings";
import { getAllVideos } from "@/lib/youtube";

// Tab-specific heavy components — split into their own chunks so a
// dashboard-only visit doesn't ship ~3000 lines of CRUD JS to the
// browser. Each `dynamic()` import becomes a separate chunk that's
// only fetched when its tab is actually active.
//
// `loading` props show a layout-matching skeleton (TabSkeleton) while
// the chunk downloads, instead of a blank pane that makes admins
// think the click broke.
//
// Sizes: MembersCrud 736LOC, ListingsCrud 631LOC, IssueCoverPicker
// 329LOC, CoverPhotosManager 222LOC, ContentEditor 141LOC.
const ContentEditor = nextDynamic(() => import("./ContentEditor"), {
  loading: () => <TabSkeleton kind="form" />,
});
const ListingsCrud = nextDynamic(() => import("./ListingsCrud"), {
  loading: () => <TabSkeleton kind="list" />,
});
const MembersCrud = nextDynamic(() => import("./MembersCrud"), {
  loading: () => <TabSkeleton kind="list" />,
});
const IssueCoverPicker = nextDynamic(() => import("./IssueCoverPicker"), {
  loading: () => <TabSkeleton kind="grid" />,
});
const CoverPhotosManager = nextDynamic(() => import("./CoverPhotosManager"), {
  loading: () => <TabSkeleton kind="grid" />,
});

export const dynamic = "force-dynamic";
// Mark every admin response as noindex — overrides the root layout's
// `index: true`. Search engines (and AI scrapers) shouldn't surface
// admin URLs in results even though the dashboard itself is auth-gated.
export const metadata = {
  title: "관리자 대시보드 | 치즈필름",
  robots: { index: false, follow: false, nocache: true },
};

type Tab =
  | "dashboard"
  | "issue"
  | "listings"
  | "auditions"
  | "fan"
  | "members"
  | "content";

function resolveMemberPhoto(photoPath: string | undefined) {
  return photoPath ? storageUrl("members", photoPath) : null;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const params = await searchParams;
  const allowed = new Set<Tab>([
    "dashboard",
    "issue",
    "listings",
    "auditions",
    "fan",
    "members",
    "content",
  ]);
  const tab: Tab = allowed.has(params.tab as Tab)
    ? (params.tab as Tab)
    : "dashboard";

  // Tab-aware fetches. Auditions + fanMessages run on every tab
  // because AdminShell reads pending/unread counts into the nav badges.
  // Everything else only fires for the tab that uses it — saves
  // 1–3 Supabase roundtrips per render on most navigations.
  const needsMembers = tab === "dashboard" || tab === "members";
  const needsListings = tab === "listings";
  const needsContentItems = tab === "content";
  const needsContentMap = tab === "issue";

  const sb = serverClient();
  const [
    auditionsResult,
    fanMessagesResult,
    members,
    listings,
    contentItems,
    contentMap,
  ] = await Promise.all([
    sb
      .from("auditions")
      .select("*")
      .order("created_at", { ascending: false }),
    sb
      .from("fan_messages")
      .select("*")
      .order("created_at", { ascending: false }),
    needsMembers ? getMembers() : Promise.resolve([] as Awaited<ReturnType<typeof getMembers>>),
    needsListings ? getAllListings() : Promise.resolve([] as Awaited<ReturnType<typeof getAllListings>>),
    needsContentItems ? getAllContent() : Promise.resolve([] as Awaited<ReturnType<typeof getAllContent>>),
    needsContentMap ? loadContentMap() : Promise.resolve(new Map<string, string>()),
  ]);
  const auditions = (auditionsResult.data ?? []) as Audition[];
  const fanMessages = ((fanMessagesResult.data ?? []) as FanMessage[]).map(
    (m) => ({ ...m, is_read: m.is_read ? 1 : 0 }),
  );

  // Only fetch the YouTube catalogue when the admin is actually on the
  // issue-cover picker — `getAllVideos` is expensive on the first cold
  // hit (HEAD-probes every video for shorts classification).
  const pickerVideos =
    tab === "issue"
      ? (await getAllVideos()).longform.map((v) => ({
          id: v.id,
          title: v.title,
          publishedAt: v.publishedAt,
          thumbnail: v.thumbnail,
        }))
      : [];

  // Pre-resolve audition presentation data so each `<details>` expansion
  // stays sync. Two N+1s previously fired *per expanded row*:
  //   - `resolveAuditionPhoto(photo_url)` — signed-URL roundtrip per row
  //   - `listingSummary(listing_id)`     — Supabase lookup per row
  // Doing both at the page level lets us parallelise the first and
  // dedupe the second (most auditions share a handful of listing IDs).
  const auditionRows = tab === "auditions" ? (auditionsResult.data ?? []) as Audition[] : [];
  const auditionPhotos = tab === "auditions"
    ? await batchResolveAuditionPhotos(
        auditionRows.map((a) => ({ id: a.id, photo_url: a.photo_url })),
      )
    : new Map<number, string | null>();
  const auditionListingSummaries = tab === "auditions"
    ? await (async () => {
        const ids = Array.from(
          new Set(
            auditionRows
              .map((a) => a.listing_id)
              .filter((id): id is number => id != null),
          ),
        );
        const pairs = await Promise.all(
          ids.map(async (id) => [id, await listingSummary(id)] as const),
        );
        return new Map(pairs.filter(([, s]) => !!s) as [number, string][]);
      })()
    : new Map<number, string>();

  const auditionStats = {
    total: auditions.length,
    pending: auditions.filter((a) => a.status === "pending").length,
    reviewing: auditions.filter((a) => a.status === "reviewing").length,
    accepted: auditions.filter((a) => a.status === "accepted").length,
    rejected: auditions.filter((a) => a.status === "rejected").length,
  };
  const fanStats = {
    total: fanMessages.length,
    unread: fanMessages.filter((m) => !m.is_read).length,
  };

  // 7-day trend — submissions in the last 7 days vs the prior 7 days.
  const now = Date.now();
  const DAY = 24 * 60 * 60_000;
  const cutoff7 = now - 7 * DAY;
  const cutoff14 = now - 14 * DAY;
  const countInWindow = (
    list: Array<{ created_at: string }>,
    fromMs: number,
    toMs: number,
  ) => list.filter((x) => {
    const t = new Date(x.created_at).getTime();
    return t >= fromMs && t < toMs;
  }).length;
  const trend = {
    auditions7: countInWindow(auditions, cutoff7, now),
    auditionsPrev7: countInWindow(auditions, cutoff14, cutoff7),
    fan7: countInWindow(fanMessages, cutoff7, now),
    fanPrev7: countInWindow(fanMessages, cutoff14, cutoff7),
  };
  const memberPhotos = members.map((m) => ({
    slug: m.slug,
    name: m.name,
    nameEn: m.nameEn,
    roleLabel: m.roleLabel,
    accent: m.accent,
    photoUrl: resolveMemberPhoto(m.photoPath),
  }));

  return (
    <AdminShell
      active={tab}
      username={session.username}
      badges={{
        auditions: auditionStats.pending,
        fan: fanStats.unread,
      }}
    >
      {tab === "dashboard" && (
        <DashboardView
          auditionStats={auditionStats}
          fanStats={fanStats}
          memberCount={members.length}
          memberPhotoCount={memberPhotos.filter((p) => p.photoUrl).length}
          // 대시보드 패널은 '받은 편지함'처럼 동작 — 검토/읽음 처리한 건은
          // 자동으로 사라지고 새로 들어온 미처리 건만 위로 올라옴.
          recentAuditions={auditions
            .filter((a) => a.status === "pending")
            .slice(0, 5)}
          recentMessages={fanMessages
            .filter((m) => !m.is_read)
            .slice(0, 5)}
          trend={trend}
        />
      )}

      {tab === "issue" && (
        <div>
          <PageHeader
            title="이번 호 표지"
            subtitle="홈 hero에 표시되는 표지 사진(우선) 및 폴백 영상을 관리합니다."
          />
          <div className="space-y-10">
            <section>
              <SubSectionHeader
                title="표지 사진"
                subtitle="홈 hero에서 2초마다 넘어가는 가로형 사진들. 비어있으면 아래 표지 영상이 폴백으로 떠요."
              />
              <CoverPhotosManager />
            </section>
            <section>
              <SubSectionHeader
                title="표지 영상 (폴백)"
                subtitle="표지 사진이 한 장도 없을 때만 표시되는 유튜브 표지 영상 (최대 10개)"
              />
              <IssueCoverPicker
                videos={pickerVideos}
                initial={Array.from({ length: 10 }, (_, i) =>
                  getContent(contentMap, `works.${i + 1}.videoId`).trim(),
                )}
              />
            </section>
          </div>
        </div>
      )}

      {tab === "listings" && (
        <div>
          <PageHeader
            title="지원 공고"
            subtitle={`총 ${listings.length}건 · 모집중 ${listings.filter((l) => l.status === "open").length}건`}
          />
          <ListingsCrud listings={listings} />
        </div>
      )}

      {tab === "auditions" && (
        <div>
          <PageHeader
            title="오디션 지원"
            subtitle={`총 ${auditionStats.total}건 · 검토 대기 ${auditionStats.pending}건`}
          />
          <AdminListToolbar
            scope="audition"
            total={auditions.length}
          />
          <AuditionsTable
            items={auditions}
            photos={auditionPhotos}
            listingSummaries={auditionListingSummaries}
          />
        </div>
      )}

      {tab === "fan" && (
        <div>
          <PageHeader
            title="응원 메시지"
            subtitle={`총 ${fanStats.total}건 · 안 읽음 ${fanStats.unread}건`}
          />
          <AdminListToolbar
            scope="fan"
            total={fanMessages.length}
          />
          <FanMessagesTable items={fanMessages} />
        </div>
      )}

      {tab === "members" && (
        <div>
          <PageHeader
            title="멤버 관리"
            subtitle={`총 ${members.length}명 · 사진 ${memberPhotos.filter((p) => p.photoUrl).length}건 등록`}
          />
          <MembersCrud
            members={memberPhotos.map((p) => {
              const full = members.find((m) => m.slug === p.slug)!;
              return {
                slug: full.slug,
                name: full.name,
                nameEn: full.nameEn,
                role: full.role,
                roleLabel: full.roleLabel,
                highlight: full.highlight,
                bio: full.bio,
                works: full.works,
                joinedNote: full.joinedNote,
                instagram: full.instagram,
                sourceUrl: full.sourceUrl,
                accent: full.accent,
                uncertain: full.uncertain,
                photoUrl: p.photoUrl,
              };
            })}
          />
        </div>
      )}

      {tab === "content" && (
        <div>
          <PageHeader
            title="사이트 콘텐츠"
            subtitle="사이트에 표시되는 모든 텍스트를 여기서 편집"
          />
          <ContentEditor items={contentItems} />
        </div>
      )}
    </AdminShell>
  );
}

// ─── Dashboard ────────────────────────────────────────────

function DashboardView({
  auditionStats,
  fanStats,
  memberCount,
  memberPhotoCount,
  recentAuditions,
  recentMessages,
  trend,
}: {
  auditionStats: { total: number; pending: number; reviewing: number; accepted: number; rejected: number };
  fanStats: { total: number; unread: number };
  memberCount: number;
  memberPhotoCount: number;
  recentAuditions: Audition[];
  recentMessages: FanMessage[];
  trend: { auditions7: number; auditionsPrev7: number; fan7: number; fanPrev7: number };
}) {
  const auditionDelta = trend.auditions7 - trend.auditionsPrev7;
  const fanDelta = trend.fan7 - trend.fanPrev7;
  return (
    <div>
      <PageHeader
        title="대시보드"
        subtitle="오늘 들어온 응답을 한눈에 확인하세요."
      />

      {/* KPI grid — 2 columns on phone, 4 on desktop. Tiles are
          intentionally denser than the previous KpiCard (less padding,
          smaller value type) to feel like a real product metric strip. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiTile
          label="검토 대기"
          value={auditionStats.pending}
          hint={`전체 오디션 ${auditionStats.total}`}
        />
        <KpiTile
          label="안 읽은 응원"
          value={fanStats.unread}
          hint={`전체 메시지 ${fanStats.total}`}
        />
        <KpiTile
          label="합격자"
          value={auditionStats.accepted}
          hint={`검토중 ${auditionStats.reviewing}`}
        />
        <KpiTile
          label="멤버 사진"
          value={`${memberPhotoCount} / ${memberCount}`}
          hint={`${Math.round((memberPhotoCount / Math.max(1, memberCount)) * 100)}% 등록`}
        />
      </div>

      {/* 7-day trend — same width as the KPI grid; treated as a second
          row of compact tiles so the eye sweeps left-to-right naturally. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <KpiTile
          label="최근 7일 오디션"
          value={trend.auditions7}
          hint={`지난 주 ${trend.auditionsPrev7}건`}
          delta={auditionDelta}
        />
        <KpiTile
          label="최근 7일 응원"
          value={trend.fan7}
          hint={`지난 주 ${trend.fanPrev7}건`}
          delta={fanDelta}
        />
      </div>

      {/* Inbox-style panels — sit below the strip and act as
          actionable lists. Items disappear once they're processed. */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel
          title="검토 대기 오디션"
          link={{ href: "/admin?tab=auditions", label: "전체 보기" }}
        >
          {recentAuditions.length === 0 ? (
            <EmptyState>✓ 검토 대기 중인 오디션이 없어요.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100 -m-4">
              {recentAuditions.map((a) => (
                <li key={a.id} className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-zinc-50 transition-colors">
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-zinc-900 truncate">
                      {a.name}
                      <span className="ml-2 text-zinc-400 font-mono font-normal text-[11px] tabular-nums">
                        #{String(a.id).padStart(4, "0")}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {a.email} · {new Date(a.created_at).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  <StatusPill status={a.status as AuditionStatus} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="안 읽은 응원"
          link={{ href: "/admin?tab=fan", label: "전체 보기" }}
        >
          {recentMessages.length === 0 ? (
            <EmptyState>✓ 모든 응원을 확인했어요.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100 -m-4">
              {recentMessages.map((m) => (
                <li key={m.id} className="px-4 py-3 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-zinc-900">
                      {m.nickname}
                    </div>
                    {!m.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600" aria-label="안 읽음" />
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-zinc-600 line-clamp-2 leading-relaxed">
                    {m.message}
                  </p>
                  <div className="mt-1 text-[10px] text-zinc-400 tabular-nums">
                    {new Date(m.created_at).toLocaleString("ko-KR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

/**
 * Smaller header used inside a page section (e.g. "표지 사진" and
 * "표지 영상" inside the 이번 호 tab). Lighter weight than PageHeader
 * because it's a sub-grouping.
 */
function SubSectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-[15px] font-bold text-zinc-900">{title}</h2>
      {subtitle && <p className="text-[12px] text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Auditions ────────────────────────────────────────────

const ROLE_PREF_KO: Record<string, string> = {
  lead: "주연",
  support: "조연",
  extra: "단역",
  staff: "스태프",
};
function rolePrefKo(v: string | null): string | null {
  if (!v) return null;
  return ROLE_PREF_KO[v] ?? v;
}

const GENDER_KO: Record<string, string> = {
  female: "여성",
  male: "남성",
  other: "기타",
};

/**
 * Auditions list — real admin table feel.
 *
 * The whole table sits inside a single bordered surface with a sticky
 * column header row. Each row is a <details> that expands inline to
 * show the candidate dossier. `grid` template ensures columns line up
 * with the header.
 */
function AuditionsTable({
  items,
  photos,
  listingSummaries,
}: {
  items: Audition[];
  photos: Map<number, string | null>;
  listingSummaries: Map<number, string>;
}) {
  if (items.length === 0)
    return <EmptyCard>아직 접수된 오디션 지원이 없습니다.</EmptyCard>;

  // `overflow-hidden` on the container was breaking sticky positioning
  // (sticky needs a scrolling ancestor, and overflow-hidden disables
  // that). The translucent `bg-zinc-50/95` on the sticky header was
  // also letting the row underneath bleed through visually. Both
  // resolved here: outer surface uses `overflow-clip` (clips visually
  // without disabling sticky), header background is now fully opaque.
  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      {/* Column header row. Stays at the top of the table; doesn't
          need to sticky-scroll since the table is short enough — we'd
          add sticky behaviour back if/when paging gets long. */}
      <div className="hidden sm:grid grid-cols-[88px_1fr_120px_100px_110px_24px] gap-3 items-center px-4 py-3 bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500 rounded-t-lg">
        <span>ID</span>
        <span>지원자</span>
        <span>포지션</span>
        <span>상태</span>
        <span>제출일</span>
        <span aria-hidden />
      </div>
      <ul className="divide-y divide-zinc-100">
        {items.map((a) => (
          <li key={a.id}>
            <details
              className="group"
              data-aud-row
              data-aud-search={`${a.name} ${a.email} ${a.phone ?? ""} ${a.intro} ${a.role_preference ?? ""} ${a.experience ?? ""}`}
            >
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden grid grid-cols-[1fr_auto_24px] sm:grid-cols-[88px_1fr_120px_100px_110px_24px] gap-3 items-center px-4 py-3 hover:bg-zinc-50 transition-colors text-[13px]">
                <span className="hidden sm:inline text-[11px] font-mono text-zinc-500 tabular-nums">
                  #{String(a.id).padStart(4, "0")}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold text-zinc-900">{a.name}</span>
                  {a.age && <span className="ml-1.5 text-zinc-400 text-[11px]">{a.age}세</span>}
                  <span className="block text-[11px] text-zinc-500 truncate mt-0.5">{a.email}</span>
                </span>
                <span className="hidden sm:inline text-zinc-700 text-[12px] truncate">{rolePrefKo(a.role_preference) ?? "—"}</span>
                <span className="hidden sm:flex justify-self-start">
                  <StatusPill status={a.status as AuditionStatus} />
                </span>
                <span className="sm:hidden">
                  <StatusPill status={a.status as AuditionStatus} />
                </span>
                <span className="hidden sm:inline text-[11px] text-zinc-500 tabular-nums">
                  {new Date(a.created_at).toLocaleDateString("ko-KR")}
                </span>
                <span className="text-zinc-400 text-xs group-open:rotate-180 transition-transform justify-self-end">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M3 6l5 5 5-5z" /></svg>
                </span>
              </summary>
              <AuditionDetail
                audition={a}
                photoSrc={photos.get(a.id) ?? null}
                listing={a.listing_id != null ? listingSummaries.get(a.listing_id) ?? null : null}
              />
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Expanded audition body — laid out like a candidate dossier:
 *   - Left rail: portrait photo + ID badge + key facts (제출일, 공고, 포지션, 성별, 연락처)
 *   - Right column: 자기소개 quote → 경력 → 포트폴리오, with editorial section dividers
 *   - Bottom: full-width status actions bar
 *
 * Both `photoSrc` and `listing` are pre-resolved at the page level
 * (AdminPage → batchResolveAuditionPhotos + listingSummaries map) so
 * this stays a pure sync component. Previously each row fired its own
 * Supabase round-trips on expand, which made every `<details>` open
 * pause for ~200ms with N+1 latency.
 */
function AuditionDetail({
  audition: a,
  photoSrc,
  listing,
}: {
  audition: Audition;
  photoSrc: string | null;
  listing: string | null;
}) {
  const submitted = new Date(a.created_at);
  const submittedStr = `${submitted.getFullYear()}.${String(submitted.getMonth() + 1).padStart(2, "0")}.${String(submitted.getDate()).padStart(2, "0")} ${String(submitted.getHours()).padStart(2, "0")}:${String(submitted.getMinutes()).padStart(2, "0")}`;
  return (
    <div className="bg-gradient-to-b from-zinc-50 to-white border-t border-zinc-200">
      <div className="px-6 py-6 grid lg:grid-cols-[200px_1fr] gap-8">
        {/* ── Left rail ── */}
        <aside className="space-y-4">
          {/* Photo card */}
          <div className="relative w-full max-w-[200px]">
            {photoSrc ? (
              <a
                href={photoSrc}
                target="_blank"
                rel="noreferrer"
                className="block aspect-[4/5] overflow-hidden rounded-md ring-1 ring-zinc-300 shadow-sm hover:ring-purple-400 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoSrc}
                  alt={`${a.name} 프로필`}
                  className="w-full h-full object-cover"
                />
              </a>
            ) : (
              <div className="aspect-[4/5] rounded-md border border-dashed border-zinc-300 grid place-items-center text-xs text-zinc-400 bg-white">
                사진 없음
              </div>
            )}
            <div className="absolute -top-2 -left-2 bg-zinc-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-sm shadow-sm tabular-nums">
              #{String(a.id).padStart(4, "0")}
            </div>
          </div>

          {/* Facts — Toss-style soft card. Dropped the bordered table
              look, swapped the broken ▣-prefixed purple link for a
              proper tinted pill, and used softer dividers. */}
          <dl className="rounded-xl bg-zinc-50 divide-y divide-zinc-200/60 text-xs overflow-hidden">
            <FactRow label="제출일" value={submittedStr} mono />
            <FactRow
              label="지원 공고"
              value={
                listing ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-semibold max-w-full">
                    <span className="truncate">{listing}</span>
                  </span>
                ) : (
                  <span className="text-zinc-400 italic">미지정</span>
                )
              }
            />
            <FactRow label="희망 포지션" value={rolePrefKo(a.role_preference) ?? "—"} />
            <FactRow
              label="생년월일"
              value={
                a.birthdate
                  ? `${a.birthdate}${a.age ? ` · 만 ${a.age}세` : ""}`
                  : a.age
                    ? `만 ${a.age}세`
                    : "—"
              }
              mono={!!a.birthdate}
            />
            <FactRow
              label="성별"
              value={a.gender ? GENDER_KO[a.gender] ?? a.gender : "—"}
            />
          </dl>
        </aside>

        {/* ── Right column ── */}
        <div className="min-w-0 space-y-7">
          {/* Header */}
          <div className="pb-3 border-b border-zinc-200">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h3 className="text-2xl font-bold text-zinc-900 leading-tight">{a.name}</h3>
              <span className="text-sm text-zinc-500">{rolePrefKo(a.role_preference) ?? "포지션 미지정"} 지원</span>
            </div>
            <div className="mt-1.5 flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
              <a
                href={`mailto:${a.email}`}
                className="inline-flex items-center gap-1.5 hover:text-purple-700"
              >
                <span aria-hidden className="text-zinc-400">✉</span>
                {a.email}
              </a>
              {a.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden className="text-zinc-400">☏</span>
                  <span className="tabular-nums">{a.phone}</span>
                </span>
              )}
            </div>
          </div>

          {/* 자기소개 — Toss-style soft card. The previous version drew a
              4px purple bar with a floating dot at the top; for a
              short intro (e.g. "dwd") that bar looked oversized and
              the dot poked out of the card visually. A plain rounded
              fill scales with the content. */}
          <DetailSection eyebrow="자기소개">
            <blockquote className="rounded-xl bg-zinc-50 px-4 py-3 text-[14px] text-zinc-800 whitespace-pre-wrap leading-relaxed">
              {a.intro}
            </blockquote>
          </DetailSection>

          {/* 경력 */}
          {a.experience && (
            <DetailSection eyebrow="경력 · 제작 활동">
              <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                {a.experience}
              </p>
            </DetailSection>
          )}

          {/* 포트폴리오 */}
          <DetailSection eyebrow="포트폴리오 링크">
            {a.portfolio_url ? (
              <a
                href={a.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-purple-700 hover:underline break-all"
              >
                <span aria-hidden>↗</span>
                {a.portfolio_url}
              </a>
            ) : (
              <span className="text-sm text-zinc-400 italic">제출 안 함</span>
            )}
          </DetailSection>
        </div>
      </div>

      {/* Status actions */}
      <div className="px-6 py-4 border-t border-zinc-200 bg-white">
        <AdminActions type="audition" id={a.id} currentStatus={a.status} />
      </div>
    </div>
  );
}

function DetailSection({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="text-[13px] font-bold text-zinc-900 mb-2">{eyebrow}</h4>
      {children}
    </section>
  );
}

function FactRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="px-3 py-2.5 grid grid-cols-[80px_1fr] items-start gap-2 min-w-0">
      <dt className="text-[10px] tracking-wider uppercase font-semibold text-zinc-500 pt-0.5">
        {label}
      </dt>
      <dd className={`text-xs text-zinc-800 min-w-0 break-words ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

// ─── Fan Messages ─────────────────────────────────────────

/**
 * Fan messages list — now a real admin inbox table, not the previous
 * "two-column card wall" which read like a marketing block. Each row
 * is a single line at rest (sender · short preview · status pill ·
 * date) and expands to show the full message + actions inline.
 *
 * Same `<details>` pattern as the auditions table so keyboard
 * navigation (Tab → Enter) is consistent.
 */
function FanMessagesTable({ items }: { items: FanMessage[] }) {
  if (items.length === 0)
    return <EmptyCard>아직 받은 응원 메시지가 없습니다.</EmptyCard>;

  return (
    // Same fix as AuditionsTable: dropped `overflow-hidden` (breaks
    // sticky) + opaque header bg + safari summary marker hide.
    <div className="rounded-lg border border-zinc-200 bg-white">
      {/* Column header. Not sticky here — the table sits inside a
          short scrolling region. Add back sticky if pagination grows. */}
      <div className="hidden sm:grid grid-cols-[16px_140px_1fr_100px_110px_24px] gap-3 items-center px-4 py-3 bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-500 rounded-t-lg">
        <span aria-hidden />
        <span>닉네임</span>
        <span>메시지</span>
        <span>상태</span>
        <span>제출일</span>
        <span aria-hidden />
      </div>
      <ul className="divide-y divide-zinc-100">
        {items.map((m) => (
          <li key={m.id}>
            <details
              className="group"
              data-fan-row
              data-fan-search={`${m.nickname} ${m.email ?? ""} ${m.message} ${m.favorite_work ?? ""}`}
            >
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden grid grid-cols-[16px_1fr_24px] sm:grid-cols-[16px_140px_1fr_100px_110px_24px] gap-3 items-center px-4 py-3 hover:bg-zinc-50 transition-colors text-[13px]">
              <span
                className={`w-1.5 h-1.5 rounded-full justify-self-center ${
                  m.is_read ? "bg-transparent" : "bg-purple-600"
                }`}
                aria-label={m.is_read ? "" : "안 읽음"}
              />
              <span className="font-semibold text-zinc-900 truncate">{m.nickname}</span>
              <span className="text-[12px] text-zinc-600 truncate">
                {m.favorite_work && (
                  <span className="text-zinc-400 mr-1.5">{m.favorite_work} ·</span>
                )}
                {m.message.replace(/\s+/g, " ").slice(0, 80)}
              </span>
              <span
                className={`hidden sm:inline-flex items-center justify-center text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md tabular-nums ${
                  m.is_read ? "bg-zinc-100 text-zinc-500" : "bg-purple-100 text-purple-700"
                }`}
              >
                {m.is_read ? "확인함" : "NEW"}
              </span>
              <span className="hidden sm:inline text-[11px] text-zinc-500 tabular-nums">
                {new Date(m.created_at).toLocaleDateString("ko-KR")}
              </span>
              <span className="text-zinc-400 text-xs group-open:rotate-180 transition-transform justify-self-end">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M3 6l5 5 5-5z" /></svg>
              </span>
            </summary>
            <FanMessageDetail message={m} />
          </details>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FanMessageDetail({ message: m }: { message: FanMessage }) {
  return (
    <div className="bg-zinc-50/60 border-t border-zinc-200 px-6 py-5">
      <div className="max-w-2xl space-y-4">
        <div className="text-[12px] text-zinc-500 tabular-nums">
          {new Date(m.created_at).toLocaleString("ko-KR")}
          {m.email && (
            <>
              <span className="mx-2 text-zinc-300">·</span>
              <a href={`mailto:${m.email}`} className="text-purple-700 hover:underline">
                {m.email}
              </a>
            </>
          )}
        </div>
        <blockquote className="rounded-xl bg-white border border-zinc-200 px-4 py-3 text-[14px] text-zinc-800 whitespace-pre-wrap leading-relaxed">
          {m.message}
        </blockquote>
        <div className="pt-2">
          <AdminActions
            type="fan"
            id={m.id}
            currentIsRead={Boolean(m.is_read)}
          />
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center text-sm text-zinc-400">
      {children}
    </div>
  );
}
