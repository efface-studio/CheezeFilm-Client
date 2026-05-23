"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  videosScanned: number;
  totalFound: number;
  alreadyKnownCount: number;
  toAddCount: number;
  plan: Array<{
    slug: string;
    name: string;
    roleLabel: string;
    instagram?: string;
    worksPreview: string[];
    worksTotal: number;
  }>;
  alreadyKnown: Array<{
    slug: string;
    name: string;
    appearedInCount: number;
  }>;
};

/**
 * Admin button — "영상에서 출연자 가져오기". Scans every video's
 * description for cast lines, shows a preview of who'd get added
 * (already-registered names are skipped), and on confirm inserts them
 * all in one shot. Imported rows are flagged `uncertain: true` so the
 * admin can finish each profile manually.
 */
export default function CastSyncButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ added: number; failed: number } | null>(null);
  const [, startTransition] = useTransition();

  async function openPreview() {
    setOpen(true);
    setLoading(true);
    setError("");
    setDone(null);
    try {
      const res = await fetch("/api/admin/members/sync-from-videos");
      if (!res.ok) throw new Error(`미리보기 실패 (${res.status})`);
      const data = (await res.json()) as Plan;
      setPlan(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function commit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/members/sync-from-videos", {
        method: "POST",
      });
      const data = (await res.json()) as { added: number; failed: number };
      if (!res.ok) throw new Error("저장 실패");
      setDone(data);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPreview}
        className="text-sm font-bold px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-[0.98] transition-all"
      >
        영상에서 가져오기
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/50 p-4 backdrop-blur-sm"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-xl shadow-2xl max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  영상에서 출연자 가져오기
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  영상 설명의 `출연 / 주연 / 조연` 라인을 스캔합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 grid place-items-center"
                aria-label="닫기"
              >
                ✕
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading && (
                <div className="py-10 text-center text-sm text-zinc-500">
                  영상 설명 스캔 중…
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700 text-sm">
                  {error}
                </div>
              )}

              {done && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800 text-sm">
                  <div className="font-bold">완료</div>
                  <div className="mt-1">
                    {done.added}명 추가됨
                    {done.failed > 0 ? ` · ${done.failed}건 실패` : ""}
                  </div>
                </div>
              )}

              {plan && !done && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <Stat label="스캔" value={plan.videosScanned} unit="편" />
                    <Stat
                      label="발견"
                      value={plan.totalFound}
                      unit="명"
                    />
                    <Stat
                      label="추가 예정"
                      value={plan.toAddCount}
                      unit="명"
                      accent
                    />
                  </div>

                  {plan.toAddCount === 0 ? (
                    <div className="py-10 text-center text-sm text-zinc-500">
                      추가할 새 출연자가 없어요. 모두 이미 등록된 멤버입니다.
                    </div>
                  ) : (
                    <div>
                      <div className="text-[12px] font-bold text-zinc-700 mb-2">
                        새로 추가될 멤버 ({plan.toAddCount})
                      </div>
                      <ul className="border border-zinc-200 rounded-xl divide-y divide-zinc-100 max-h-72 overflow-y-auto">
                        {plan.plan.map((p) => (
                          <li
                            key={p.slug}
                            className="px-3 py-2.5 flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-zinc-900 flex items-center gap-2 flex-wrap">
                                {p.name}
                                <span className="text-[10px] uppercase tracking-wider bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">
                                  {p.roleLabel}
                                </span>
                                {p.instagram && (
                                  <span className="text-[10px] uppercase tracking-wider bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                                    @{p.instagram}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-1 truncate">
                                {p.worksPreview.join(" · ")}
                                {p.worksTotal > p.worksPreview.length &&
                                  ` 외 ${p.worksTotal - p.worksPreview.length}편`}
                              </div>
                            </div>
                            <code className="text-[10px] text-zinc-400 font-mono shrink-0">
                              {p.slug}
                            </code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {plan.alreadyKnownCount > 0 && (
                    <div>
                      <div className="text-[12px] font-bold text-zinc-700 mb-2">
                        이미 등록된 멤버 (스킵) — {plan.alreadyKnownCount}명
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.alreadyKnown.slice(0, 24).map((k) => (
                          <span
                            key={k.slug}
                            className="text-[11px] text-zinc-600 bg-zinc-100 px-2 py-1 rounded-full"
                          >
                            {k.name}
                            <span className="text-zinc-400 ml-1 tabular-nums">
                              {k.appearedInCount}편
                            </span>
                          </span>
                        ))}
                        {plan.alreadyKnown.length > 24 && (
                          <span className="text-[11px] text-zinc-400 px-2 py-1">
                            외 {plan.alreadyKnown.length - 24}명…
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    추가되는 멤버는 모두 <strong>「추정」</strong> 표시가 붙어요.
                    이름·인스타·작품 목록까지 기본값으로 채워지니, 추가 후 멤버
                    페이지에서 개별 보강하세요.
                  </p>
                </>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2">
              {done ? (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-bold px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
                >
                  닫기
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => !busy && setOpen(false)}
                    disabled={busy}
                    className="text-sm font-bold px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={commit}
                    disabled={busy || loading || !plan || plan.toAddCount === 0}
                    className="text-sm font-bold px-5 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                  >
                    {busy
                      ? "추가 중…"
                      : plan
                        ? `${plan.toAddCount}명 추가`
                        : "추가"}
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: number;
  unit: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        accent ? "border-purple-200 bg-purple-50" : "border-zinc-200 bg-white"
      }`}
    >
      <div
        className={`text-[10px] font-bold uppercase tracking-wider ${accent ? "text-purple-700" : "text-zinc-500"}`}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 text-xl font-extrabold tabular-nums ${accent ? "text-purple-900" : "text-zinc-900"}`}
      >
        {value.toLocaleString()}
        <span className="text-xs font-medium text-zinc-500 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
