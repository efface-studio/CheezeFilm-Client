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

export default function FanForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

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
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "전송에 실패했어요.");
      }
      setStatus("success");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "오류가 발생했어요.");
    }
  }

  if (status === "success") {
    return (
      <div className="relative text-center py-10">
        <Confetti count={20} />
        <div className="text-5xl mb-4">🧀</div>
        <h3
          className="text-3xl mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          잘 받았어요!
        </h3>
        <p className="text-cheeze-ink-soft">
          따뜻한 응원, 정말 감사합니다.
          <br />
          제작팀이 한 통씩 출력해 스튜디오 벽에 붙여두고 있어요.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="btn-yellow mt-6"
        >
          한마디 더 남기기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-cheeze-purple mb-1">
          FAN MESSAGE
        </div>
        <h2
          className="text-3xl mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          응원 한마디 남기기
        </h2>
        <p className="text-sm text-cheeze-ink-soft">
          익명도 환영합니다. 가볍게 인사부터, 깊은 후기까지 — 뭐든 좋아요.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="field-label" htmlFor="nickname">
            닉네임 *
          </label>
          <input
            id="nickname"
            name="nickname"
            required
            maxLength={30}
            className="field-input"
            placeholder="치필러"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="email">
            이메일 (선택)
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="field-input"
            placeholder="답장을 원하면 적어주세요"
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="favorite_work">
          좋아하는 작품
        </label>
        <select
          id="favorite_work"
          name="favorite_work"
          className="field-select"
          defaultValue=""
        >
          <option value="">선택해주세요</option>
          {FAVORITES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label" htmlFor="message">
          응원 메시지 *
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          maxLength={2000}
          className="field-textarea"
          placeholder="치즈필름에게 하고 싶은 말을 자유롭게 적어주세요."
        />
      </div>

      {status === "error" && (
        <div className="border-2 border-cheeze-wine bg-cheeze-wine/10 p-3 text-sm text-cheeze-purple">
          ⚠ {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-yellow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "전송 중..." : "🧀 메시지 보내기"}
        </button>
        <span className="text-xs text-cheeze-ink-soft/70">
          * 표시 항목은 필수입니다.
        </span>
      </div>
    </form>
  );
}
