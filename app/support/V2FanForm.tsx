"use client";

import { useState } from "react";
import Confetti from "@/components/Confetti";

type Status = "idle" | "submitting" | "success" | "error";

const FAVORITES = [
  "일진에게 찍혔을 때",
  "일진에게 찍혔을 때 시즌2",
  "일진에게 반했을 때",
  "치즈필름 채널 전체",
  "기타",
];

export default function V2FanForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      nickname: String(fd.get("nickname") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim() || null,
      favorite_work: String(fd.get("favorite_work") ?? "").trim() || null,
      message: String(fd.get("message") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/fan-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "전송 실패");
      }
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    }
  }

  if (status === "success") {
    return (
      <div className="relative text-center py-16 border border-cheeze-purple-deep/40">
        <Confetti count={22} />
        <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-purple mb-4">
          — Received
        </div>
        <h3 className="text-4xl mb-3" style={{ fontFamily: "var(--font-display)" }}>
          잘 받았어요.
        </h3>
        <p className="text-cheeze-ink-soft max-w-sm mx-auto leading-relaxed">
          따뜻한 응원, 정말 감사합니다. 제작팀이 한 통씩 직접 읽고 있어요.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-8 inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-cheeze-ink text-white text-[14px] font-semibold hover:bg-cheeze-ink-soft transition-colors"
        >
          한마디 더 보내기
          <span aria-hidden>→</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div>
        <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-purple mb-2">
          — Fan letter
        </div>
        <h2 className="text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          응원 한마디
        </h2>
        <p className="mt-2 text-sm text-cheeze-ink-soft">
          익명도 환영. 한 줄 인사부터 깊은 후기까지 — 뭐든 좋아요.
        </p>
      </div>

      <div className="grid lg:grid-cols-[160px_1fr] gap-x-8 gap-y-5 pt-6 border-t border-cheeze-purple-deep/15">
        <div className="text-[10px] tracking-[0.35em] uppercase text-cheeze-purple-deep">
          From you
        </div>
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
            <label className="block">
              <span className="text-xs tracking-widest uppercase text-cheeze-olive">
                닉네임 <span className="text-cheeze-purple ml-1">*</span>
              </span>
              <input
                name="nickname"
                required
                maxLength={30}
                placeholder="치필러"
                className="mt-1.5 w-full bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm placeholder:text-cheeze-olive/50"
              />
            </label>
            <label className="block">
              <span className="text-xs tracking-widest uppercase text-cheeze-olive">
                이메일 (선택)
              </span>
              <input
                name="email"
                type="email"
                placeholder="답장 원하면 적어주세요"
                className="mt-1.5 w-full bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm placeholder:text-cheeze-olive/50"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs tracking-widest uppercase text-cheeze-olive">
              좋아하는 작품
            </span>
            <select
              name="favorite_work"
              defaultValue=""
              className="mt-1.5 w-full bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm"
            >
              <option value="">선택해주세요</option>
              {FAVORITES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs tracking-widest uppercase text-cheeze-olive">
              응원 메시지 <span className="text-cheeze-purple ml-1">*</span>
            </span>
            <textarea
              name="message"
              rows={6}
              required
              maxLength={2000}
              placeholder="치즈필름에게 하고 싶은 말을 자유롭게."
              className="mt-1.5 w-full bg-transparent border border-cheeze-purple-deep/30 focus:border-cheeze-purple-deep outline-none p-3 text-sm placeholder:text-cheeze-olive/50"
            />
          </label>
        </div>
      </div>

      {status === "error" && (
        <div className="border border-cheeze-wine bg-cheeze-wine/5 px-4 py-3 text-sm text-cheeze-wine">
          ⚠ {error}
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-toss-100">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-xl bg-cheeze-ink text-white text-[15px] font-semibold hover:bg-cheeze-ink-soft disabled:bg-toss-200 disabled:text-toss-500 disabled:cursor-not-allowed transition-colors"
        >
          {status === "submitting" ? "전송 중…" : "응원 보내기"}
          {status !== "submitting" && <span aria-hidden>→</span>}
        </button>
      </div>
    </form>
  );
}
