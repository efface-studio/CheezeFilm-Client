import fs from "node:fs";
import path from "node:path";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { db, type Audition, type FanMessage } from "@/lib/db";
import { members } from "@/lib/members";
import { getAllContent } from "@/lib/content";
import AdminShell from "./AdminShell";
import AdminActions from "./AdminActions";
import MemberPhotoManager from "./MemberPhotoManager";
import ContentEditor from "./ContentEditor";
import AdminListToolbar from "./AdminListToolbar";
import MembersCrud from "./MembersCrud";

export const dynamic = "force-dynamic";
export const metadata = { title: "관리자 대시보드 | 치즈필름" };

type Tab =
  | "dashboard"
  | "auditions"
  | "fan"
  | "members"
  | "memberPhotos"
  | "content";

const PHOTO_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
function resolveMemberPhoto(slug: string) {
  const dir = path.join(process.cwd(), "public", "members");
  for (const ext of PHOTO_EXTS) {
    const file = path.join(dir, `${slug}${ext}`);
    if (fs.existsSync(file)) return `/members/${slug}${ext}`;
  }
  return null;
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
    "auditions",
    "fan",
    "members",
    "memberPhotos",
    "content",
  ]);
  const tab: Tab = allowed.has(params.tab as Tab)
    ? (params.tab as Tab)
    : "dashboard";

  const auditions = db
    .prepare("SELECT * FROM auditions ORDER BY created_at DESC")
    .all() as Audition[];
  const fanMessages = db
    .prepare("SELECT * FROM fan_messages ORDER BY created_at DESC")
    .all() as FanMessage[];
  const contentItems = getAllContent();

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
    photoUrl: resolveMemberPhoto(m.slug),
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

      {tab === "auditions" && (
        <SectionHeader
          title="오디션 지원"
          subtitle={`총 ${auditionStats.total}건 · 검토 대기 ${auditionStats.pending}건`}
        >
          <AdminListToolbar
            scope="audition"
            total={auditions.length}
            exportHref="/api/admin/export?type=auditions"
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
            exportHref="/api/admin/export?type=fan"
          />
          <FanMessagesTable items={fanMessages} />
        </SectionHeader>
      )}

      {tab === "members" && (
        <SectionHeader
          title="멤버 관리"
          subtitle={`총 ${members.length}명 · 추가 / 수정 / 삭제`}
        >
          <MembersCrud
            members={members.map((m) => ({
              slug: m.slug,
              name: m.name,
              nameEn: m.nameEn,
              role: m.role,
              roleLabel: m.roleLabel,
              highlight: m.highlight,
              bio: m.bio,
              works: m.works,
              joinedNote: m.joinedNote,
              instagram: m.instagram,
              sourceUrl: m.sourceUrl,
              accent: m.accent,
              uncertain: m.uncertain,
            }))}
          />
        </SectionHeader>
      )}

      {tab === "memberPhotos" && (
        <SectionHeader
          title="멤버 사진"
          subtitle={`${memberPhotos.filter((p) => p.photoUrl).length} / ${members.length} 등록됨`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {memberPhotos.map((m) => (
              <MemberPhotoManager key={m.slug} member={m} />
            ))}
          </div>
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
                      <span className="text-[10px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
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
    ? "text-zinc-500 bg-zinc-100"
    : isUp
      ? "text-emerald-700 bg-emerald-50"
      : "text-rose-700 bg-rose-50";
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 flex items-center justify-between gap-4">
      <div>
        <div className="text-xs text-zinc-500 font-medium">{label}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-zinc-900 tabular-nums">
            {current}
          </span>
          <span className="text-xs text-zinc-400 tabular-nums">
            지난 7일 {previous}
          </span>
        </div>
      </div>
      <div className={`text-xs font-bold px-2 py-1 rounded ${color}`}>
        {isFlat ? "변동 없음" : (isUp ? "▲" : "▼") + " " + Math.abs(pct) + "%"}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent: "purple" | "yellow" | "emerald" | "zinc";
}) {
  const accentClasses = {
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    yellow: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    zinc: "bg-zinc-50 text-zinc-700 border-zinc-200",
  }[accent];
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-zinc-500 font-medium">{label}</div>
        <div className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${accentClasses}`}>
          {hint}
        </div>
      </div>
      <div className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</div>
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
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
        {link && (
          <Link
            href={link.href}
            className="text-xs font-semibold text-purple-700 hover:text-purple-900"
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
            <span className="text-zinc-600 text-sm hidden sm:inline">{a.role_preference ?? "—"}</span>
            <StatusBadge status={a.status} />
            <span className="text-xs text-zinc-400 hidden sm:inline">
              {new Date(a.created_at).toLocaleDateString("ko-KR")}
              <span className="ml-2 text-purple-700 group-open:rotate-180 inline-block transition-transform">▾</span>
            </span>
          </summary>
          <div className="px-5 py-5 bg-zinc-50/60 border-t border-zinc-100 grid md:grid-cols-[140px_1fr] gap-6">
            {/* Profile photo column (mandatory field) */}
            <div>
              <div className="text-[11px] uppercase tracking-wider font-medium text-zinc-500 mb-1.5">프로필 사진</div>
              {a.photo_url ? (
                <a href={a.photo_url} target="_blank" rel="noreferrer" className="block w-32 aspect-[4/5] overflow-hidden border border-zinc-300 hover:border-purple-400 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.photo_url} alt={`${a.name} 프로필`} className="w-full h-full object-cover" />
                </a>
              ) : (
                <div className="w-32 aspect-[4/5] border border-dashed border-zinc-300 grid place-items-center text-xs text-zinc-400">
                  사진 없음
                </div>
              )}
            </div>

            {/* Other fields column */}
            <div className="grid md:grid-cols-3 gap-4">
            <DetailField label="연락처" value={a.phone ?? "—"} />
            <DetailField label="희망 포지션" value={a.role_preference ?? "—"} />
            <DetailField
              label="포트폴리오"
              value={
                a.portfolio_url ? (
                  <a
                    href={a.portfolio_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-700 hover:underline break-all"
                  >
                    {a.portfolio_url}
                  </a>
                ) : "—"
              }
            />
            <div className="md:col-span-3">
              <DetailField
                label="경력"
                value={
                  <p className="whitespace-pre-wrap text-sm text-zinc-700">
                    {a.experience ?? "—"}
                  </p>
                }
              />
            </div>
            <div className="md:col-span-3">
              <DetailField
                label="자기소개"
                value={
                  <blockquote className="text-sm text-zinc-700 border-l-2 border-purple-400 pl-3 whitespace-pre-wrap">
                    {a.intro}
                  </blockquote>
                }
              />
            </div>
            <div className="md:col-span-3 pt-2 border-t border-zinc-200">
              <AdminActions type="audition" id={a.id} currentStatus={a.status} />
            </div>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-medium text-zinc-500 mb-1">{label}</div>
      <div className="text-sm text-zinc-700">{value}</div>
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
          className={`rounded-lg border bg-white p-4 ${m.is_read ? "border-zinc-200 opacity-90" : "border-purple-300 ring-1 ring-purple-100"}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="font-semibold text-zinc-900">{m.nickname}</div>
              <div className="text-xs text-zinc-500">
                {m.favorite_work ? `${m.favorite_work} · ` : ""}
                {new Date(m.created_at).toLocaleString("ko-KR")}
              </div>
            </div>
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                m.is_read ? "bg-zinc-100 text-zinc-500" : "bg-purple-600 text-white"
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
