import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import {
  serverClient,
  storageUrl,
  type Audition,
  type FanMessage,
} from "@/lib/db";
import { getMembers } from "@/lib/members";
import { getAllContent, loadContentMap, getContent } from "@/lib/content";
import AdminShell from "./AdminShell";
import AdminActions from "./AdminActions";
import ContentEditor from "./ContentEditor";
import AdminListToolbar from "./AdminListToolbar";
import MembersCrud from "./MembersCrud";
import ListingsCrud from "./ListingsCrud";
import IssueCoverPicker from "./IssueCoverPicker";
import CoverPhotosManager from "./CoverPhotosManager";
import { getAllListings, listingSummary } from "@/lib/auditionListings";
import { getAllVideos } from "@/lib/youtube";

export const dynamic = "force-dynamic";
export const metadata = { title: "관리자 대시보드 | 치즈필름" };

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

  const sb = serverClient();
  const [
    auditionsResult,
    fanMessagesResult,
    listings,
    contentItems,
    members,
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
    getAllListings(),
    getAllContent(),
    getMembers(),
    loadContentMap(),
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
        <div className="space-y-12">
          {/* Photos win over videos when both are present — list them
              first so admins see the "live" source at the top. */}
          <SectionHeader
            title="표지 사진"
            subtitle="V2 홈 hero에서 2초마다 넘어가는 가로형 사진들. 비어있으면 아래 표지 영상이 폴백으로 떠요."
          >
            <CoverPhotosManager />
          </SectionHeader>
          <SectionHeader
            title="표지 영상 (폴백)"
            subtitle="표지 사진이 한 장도 없을 때만 표시되는 유튜브 표지 영상 (최대 10개)"
          >
            <IssueCoverPicker
              videos={pickerVideos}
              initial={Array.from({ length: 10 }, (_, i) =>
                getContent(contentMap, `works.${i + 1}.videoId`).trim(),
              )}
            />
          </SectionHeader>
        </div>
      )}

      {tab === "listings" && (
        <SectionHeader
          title="지원 공고"
          subtitle={`총 ${listings.length}건 · 모집중 ${listings.filter((l) => l.status === "open").length}건`}
        >
          <ListingsCrud listings={listings} />
        </SectionHeader>
      )}

      {tab === "auditions" && (
        <SectionHeader
          title="오디션 지원"
          subtitle={`총 ${auditionStats.total}건 · 검토 대기 ${auditionStats.pending}건`}
        >
          <AdminListToolbar
            scope="audition"
            total={auditions.length}
          />
          <AuditionsTable items={auditions} />
        </SectionHeader>
      )}

      {tab === "fan" && (
        <SectionHeader
          title="응원 메시지"
          subtitle={`총 ${fanStats.total}건 · 안 읽음 ${fanStats.unread}건`}
        >
          <AdminListToolbar
            scope="fan"
            total={fanMessages.length}
          />
          <FanMessagesTable items={fanMessages} />
        </SectionHeader>
      )}

      {tab === "members" && (
        <SectionHeader
          title="멤버 관리"
          subtitle={`총 ${members.length}명 · 사진 ${memberPhotos.filter((p) => p.photoUrl).length}건 등록`}
        >
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
        </SectionHeader>
      )}

      {tab === "content" && (
        <SectionHeader
          title="사이트 콘텐츠"
          subtitle="사이트에 표시되는 모든 텍스트를 여기서 편집"
        >
          <ContentEditor items={contentItems} />
        </SectionHeader>
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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">대시보드</h1>
        <p className="text-sm text-zinc-500 mt-1">
          오늘 들어온 응답을 한눈에 확인하세요.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="전체 오디션"
          value={auditionStats.total}
          accent="purple"
          hint={`검토 대기 ${auditionStats.pending}`}
        />
        <KpiCard
          label="안 읽은 응원"
          value={fanStats.unread}
          accent="yellow"
          hint={`전체 ${fanStats.total}`}
        />
        <KpiCard
          label="합격자"
          value={auditionStats.accepted}
          accent="emerald"
          hint={`검토중 ${auditionStats.reviewing}`}
        />
        <KpiCard
          label="멤버 사진"
          value={`${memberPhotoCount} / ${memberCount}`}
          accent="zinc"
          hint="등록률"
        />
      </div>

      {/* 7-day trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TrendCard
          label="최근 7일 오디션"
          current={trend.auditions7}
          previous={trend.auditionsPrev7}
        />
        <TrendCard
          label="최근 7일 응원"
          current={trend.fan7}
          previous={trend.fanPrev7}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PanelCard
          title="검토 대기 오디션"
          link={{ href: "/admin?tab=auditions", label: "전체 보기 →" }}
        >
          {recentAuditions.length === 0 ? (
            <EmptyState>✓ 검토 대기 중인 오디션이 없어요.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentAuditions.map((a) => (
                <li key={a.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-zinc-900 truncate">
                      {a.name}
                      <span className="ml-2 text-zinc-400 font-normal text-xs">
                        #{String(a.id).padStart(4, "0")}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {a.email} · {new Date(a.created_at).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title="안 읽은 응원"
          link={{ href: "/admin?tab=fan", label: "전체 보기 →" }}
        >
          {recentMessages.length === 0 ? (
            <EmptyState>✓ 모든 응원을 확인했어요.</EmptyState>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentMessages.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-zinc-900">
                      {m.nickname}
                    </div>
                    {!m.is_read && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-zinc-600 line-clamp-2">
                    {m.message}
                  </p>
                  <div className="mt-1 text-xs text-zinc-400">
                    {new Date(m.created_at).toLocaleString("ko-KR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

function TrendCard({
  label,
  current,
  previous,
}: {
  label: string;
  current: number;
  previous: number;
}) {
  const delta = current - previous;
  const pct =
    previous === 0
      ? current === 0
        ? 0
        : 100
      : Math.round((delta / previous) * 100);
  const isUp = delta > 0;
  const isFlat = delta === 0;
  const color = isFlat
    ? "text-zinc-500"
    : isUp
      ? "text-emerald-600"
      : "text-rose-600";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 flex items-center justify-between gap-4">
      <div>
        <div className="text-[12px] text-zinc-500 font-semibold">{label}</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-zinc-900 tabular-nums leading-none">
            {current}
          </span>
          <span className="text-[11px] text-zinc-400 tabular-nums">
            지난 주 {previous}
          </span>
        </div>
      </div>
      <div className={`text-sm font-bold tabular-nums ${color}`}>
        {isFlat ? "—" : (isUp ? "+" : "") + pct + "%"}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  // accent kept in the signature for caller stability but no longer wired
  // to a pastel band — the card design is now monochrome with a single
  // hint chip in zinc, which reads as a real product KPI rather than a
  // generic "AI dashboard" pastel grid.
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent: "purple" | "yellow" | "emerald" | "zinc";
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 hover:border-zinc-300 transition-colors">
      <div className="text-[12px] font-semibold text-zinc-500 mb-2">
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-3xl font-extrabold text-zinc-900 tabular-nums leading-none">
          {value}
        </div>
        {hint && (
          <div className="text-[11px] font-medium text-zinc-400 tabular-nums">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}

function PanelCard({
  title,
  link,
  children,
}: {
  title: string;
  link?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
        {link && (
          <Link
            href={link.href}
            className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-10 text-center text-sm text-zinc-400">{children}</div>
  );
}

function SectionHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        {subtitle && <p className="text-sm text-zinc-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Auditions ────────────────────────────────────────────

function statusKo(status: Audition["status"]) {
  switch (status) {
    case "pending": return "대기";
    case "reviewing": return "검토중";
    case "accepted": return "합격";
    case "rejected": return "불합격";
  }
}
function statusColor(status: Audition["status"]) {
  switch (status) {
    case "pending": return "bg-zinc-100 text-zinc-700";
    case "reviewing": return "bg-amber-100 text-amber-800";
    case "accepted": return "bg-emerald-100 text-emerald-800";
    case "rejected": return "bg-rose-100 text-rose-800";
  }
}
function StatusBadge({ status }: { status: Audition["status"] }) {
  return (
    <span
      className={`text-[11px] font-bold px-2 py-0.5 rounded ${statusColor(status)}`}
    >
      {statusKo(status)}
    </span>
  );
}

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

function AuditionsTable({ items }: { items: Audition[] }) {
  if (items.length === 0)
    return <EmptyCard>아직 접수된 오디션 지원이 없습니다.</EmptyCard>;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">
      {items.map((a) => (
        <details
          key={a.id}
          className="group"
          data-aud-row
          data-aud-search={`${a.name} ${a.email} ${a.phone ?? ""} ${a.intro} ${a.role_preference ?? ""} ${a.experience ?? ""}`}
        >
          <summary className="cursor-pointer list-none px-4 py-3 grid grid-cols-[auto_1fr_auto] sm:grid-cols-[80px_1fr_auto_auto_auto] gap-3 items-center hover:bg-zinc-50">
            <span className="text-xs font-mono text-zinc-500">
              #{String(a.id).padStart(4, "0")}
            </span>
            <span className="min-w-0">
              <span className="font-semibold text-zinc-900">{a.name}</span>
              {a.age && <span className="ml-2 text-zinc-400 text-xs">{a.age}세</span>}
              <span className="block text-xs text-zinc-500 truncate">{a.email}</span>
            </span>
            <span className="text-zinc-600 text-sm hidden sm:inline">{rolePrefKo(a.role_preference) ?? "—"}</span>
            <StatusBadge status={a.status} />
            <span className="text-xs text-zinc-400 hidden sm:inline">
              {new Date(a.created_at).toLocaleDateString("ko-KR")}
              <span className="ml-2 text-purple-700 group-open:rotate-180 inline-block transition-transform">▾</span>
            </span>
          </summary>
          <AuditionDetail audition={a} />
        </details>
      ))}
    </div>
  );
}

/**
 * Expanded audition body — laid out like a candidate dossier:
 *   - Left rail: portrait photo + ID badge + key facts (제출일, 공고, 포지션, 성별, 연락처)
 *   - Right column: 자기소개 quote → 경력 → 포트폴리오, with editorial section dividers
 *   - Bottom: full-width status actions bar
 */
async function AuditionDetail({ audition: a }: { audition: Audition }) {
  // listingSummary hits Supabase, so it returns a Promise. The previous
  // sync version stored the Promise in `listing` and React happened to
  // print [object Promise] / nothing depending on the moment — fixed
  // by awaiting it now.
  const listing = await listingSummary(a.listing_id);
  const submitted = new Date(a.created_at);
  const submittedStr = `${submitted.getFullYear()}.${String(submitted.getMonth() + 1).padStart(2, "0")}.${String(submitted.getDate()).padStart(2, "0")} ${String(submitted.getHours()).padStart(2, "0")}:${String(submitted.getMinutes()).padStart(2, "0")}`;
  return (
    <div className="bg-gradient-to-b from-zinc-50 to-white border-t border-zinc-200">
      <div className="px-6 py-6 grid lg:grid-cols-[200px_1fr] gap-8">
        {/* ── Left rail ── */}
        <aside className="space-y-4">
          {/* Photo card */}
          <div className="relative w-full max-w-[200px]">
            {a.photo_url ? (
              <a
                href={a.photo_url}
                target="_blank"
                rel="noreferrer"
                className="block aspect-[4/5] overflow-hidden rounded-md ring-1 ring-zinc-300 shadow-sm hover:ring-purple-400 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.photo_url}
                  alt={`${a.name} 프로필`}
                  className="w-full h-full object-cover"
                />
              </a>
            ) : (
              <div className="aspect-[4/5] rounded-md border border-dashed border-zinc-300 grid place-items-center text-xs text-zinc-400 bg-white">
                사진 없음
              </div>
            )}
            <div className="absolute -top-2 -left-2 bg-zinc-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded-sm shadow-sm">
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

function FanMessagesTable({ items }: { items: FanMessage[] }) {
  if (items.length === 0)
    return <EmptyCard>아직 받은 응원 메시지가 없습니다.</EmptyCard>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((m) => (
        <div
          key={m.id}
          data-fan-row
          data-fan-search={`${m.nickname} ${m.email ?? ""} ${m.message} ${m.favorite_work ?? ""}`}
          className={`rounded-xl border bg-white p-5 transition-colors ${m.is_read ? "border-zinc-200" : "border-zinc-300"}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {!m.is_read && (
                <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
              )}
              <div>
                <div className="font-bold text-zinc-900 text-[15px]">{m.nickname}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {m.favorite_work ? `${m.favorite_work} · ` : ""}
                  {new Date(m.created_at).toLocaleString("ko-KR")}
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${
                m.is_read ? "bg-zinc-100 text-zinc-500" : "bg-zinc-900 text-white"
              }`}
            >
              {m.is_read ? "확인함" : "NEW"}
            </span>
          </div>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap border-l-2 border-zinc-200 pl-3">
            {m.message}
          </p>
          {m.email && <div className="mt-2 text-xs text-zinc-500">📧 {m.email}</div>}
          <div className="mt-3 pt-3 border-t border-zinc-100">
            <AdminActions
              type="fan"
              id={m.id}
              currentIsRead={Boolean(m.is_read)}
            />
          </div>
        </div>
      ))}
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
