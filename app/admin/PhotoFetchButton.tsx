"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Stats = {
  totalMembers: number;
  withInstagram: number;
  missingPhoto: number;
  lowQuality: number;
  haveBoth: number;
};

type RunResult = {
  attempted: number;
  succeeded: number;
  upgraded: number;
  kept: number;
  failed: number;
  failures: Array<{ slug: string; name: string }>;
  skippedAsAlreadyHasPhoto: number;
};

/**
 * Triggers a server-side run that fetches each member's Instagram
 * profile picture and saves it to `public/members/<slug>.<ext>`.
 *
 * Best-effort — Instagram blocks unauthenticated scraping aggressively,
 * so some members may fail. The result modal shows succeeded/failed
 * counts plus the names that didn't come through, so the admin can
 * upload those manually.
 */
export default function PhotoFetchButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [retryLowQuality, setRetryLowQuality] = useState(true);
  const [, startTransition] = useTransition();

  async function openModal() {
    setOpen(true);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/admin/members/fetch-photos");
      if (!res.ok) throw new Error(`미리보기 실패 (${res.status})`);
      setStats((await res.json()) as Stats);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    setRunning(true);
    setError("");
    setResult(null);
    try {
      const qs = new URLSearchParams();
      if (overwrite) qs.set("overwrite", "1");
      if (retryLowQuality) qs.set("retryLowQuality", "1");
      const url = `/api/admin/members/fetch-photos${qs.toString() ? "?" + qs.toString() : ""}`;
      const res = await fetch(url, { method: "POST" });
      const data = (await res.json()) as RunResult;
      if (!res.ok) throw new Error("실행 실패");
      setResult(data);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="text-sm font-bold px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:scale-[0.98] transition-all"
      >
        인스타 사진 가져오기
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/50 p-4 backdrop-blur-sm"
          onClick={() => !running && setOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-xl shadow-2xl max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg leading-tight">
                  인스타에서 멤버 사진 가져오기
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  각 멤버의 Instagram 핸들로 공개 프로필 사진을 받아옵니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !running && setOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 grid place-items-center"
                aria-label="닫기"
              >
                ✕
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loading && (
                <div className="py-10 text-center text-sm text-zinc-500">
                  멤버 상태 확인 중…
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700 text-sm">
                  {error}
                </div>
              )}

              {stats && !result && (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="전체" value={stats.totalMembers} />
                    <Stat label="인스타" value={stats.withInstagram} />
                    <Stat
                      label="사진 없음"
                      value={stats.missingPhoto}
                      accent
                    />
                    <Stat
                      label="저화질"
                      value={stats.lowQuality}
                      accent
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 text-sm text-zinc-700 font-medium select-none">
                      <input
                        type="checkbox"
                        checked={retryLowQuality}
                        onChange={(e) => setRetryLowQuality(e.target.checked)}
                        className="rounded border-zinc-300 mt-0.5"
                      />
                      <span>
                        저화질 사진({stats.lowQuality}건) 도 다시 시도해 HD 로 교체
                        <span className="block text-[11px] text-zinc-500 font-normal mt-0.5">
                          15KB 미만인 작은 아바타를 1080×1080 변종으로 재요청.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-sm text-zinc-700 font-medium select-none">
                      <input
                        type="checkbox"
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                        className="rounded border-zinc-300 mt-0.5"
                      />
                      <span>
                        이미 깔끔한 사진이 있는 멤버({stats.haveBoth}건) 도 덮어쓰기
                      </span>
                    </label>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Instagram 은 무인증 스크래핑을 차단해서, 일부 멤버는 실패할
                    수 있어요. 다시 눌러보면 추가로 잡히기도 함. 사진은
                    `public/members/&lt;slug&gt;.{`{jpg,png,webp}`}` 로 저장.
                    같은 사람의 더 큰 사진이 받아지지 않으면 기존 파일은
                    유지합니다 (downgrade 방지).
                  </p>
                </>
              )}

              {result && (
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="시도" value={result.attempted} />
                    <Stat label="교체" value={result.upgraded ?? 0} accent />
                    <Stat label="유지" value={result.kept ?? 0} />
                    <Stat label="실패" value={result.failed} />
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    교체 = 더 큰 사진을 받아 파일을 갱신한 멤버.
                    유지 = 기존 파일이 더 커서 그대로 둔 멤버.
                    {result.skippedAsAlreadyHasPhoto > 0 &&
                      ` ${result.skippedAsAlreadyHasPhoto}명은 시도 안 함.`}
                  </p>
                  {result.failures.length > 0 && (
                    <div>
                      <div className="text-[12px] font-bold text-zinc-700 mb-2">
                        실패한 멤버 ({result.failed})
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                        {result.failures.map((f) => (
                          <span
                            key={f.slug}
                            className="text-[11px] text-zinc-600 bg-zinc-100 px-2 py-1 rounded-full"
                          >
                            {f.name}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                        Instagram 차단·비공개 계정·만료된 핸들 등 사유.
                        멤버 수정 페이지에서 직접 업로드해주세요.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-2">
              {result ? (
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
                    onClick={() => !running && setOpen(false)}
                    disabled={running}
                    className="text-sm font-bold px-4 py-2 rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={run}
                    disabled={
                      running || loading || !stats || stats.withInstagram === 0
                    }
                    className="text-sm font-bold px-5 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
                  >
                    {running
                      ? "받는 중…"
                      : stats
                        ? `${
                            overwrite
                              ? stats.withInstagram
                              : stats.missingPhoto + (retryLowQuality ? stats.lowQuality : 0)
                          }명 시작`
                        : "시작"}
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
  accent,
}: {
  label: string;
  value: number;
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
      </div>
    </div>
  );
}
