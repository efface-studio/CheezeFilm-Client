"use client";

import Image from "next/image";
import { useState } from "react";
import Confetti from "@/components/Confetti";
import type { CastChoice } from "./SupportTabs";

type Status = "idle" | "submitting" | "success" | "error";

/**
 * Fan letter — Toss-style.
 *
 *   - All editorial chrome (mono eyebrow, display-serif title, table
 *     ledger, dotted border inputs) replaced with rounded soft cards.
 *   - "좋아하는 작품" → "좋아하는 배우" picker. A 6/4/3 column chip
 *     grid of members the home spread features, each chip showing the
 *     portrait + name. Picking toggles a selection. The active chip
 *     gets a purple ring, every other chip dims slightly.
 *
 * The API still stores under `favorite_work` (no DB migration) — we
 * just write the chosen member's name into that field.
 */
export default function FanForm({
  castChoices,
}: {
  castChoices: CastChoice[];
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [favoriteCast, setFavoriteCast] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    const fd = new FormData(e.currentTarget);
    const payload = {
      nickname: String(fd.get("nickname") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim() || null,
      // API column is `favorite_work`; we reuse it to store the chosen
      // member name now. Keeps the existing admin list rendering.
      favorite_work: favoriteCast || null,
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
      setFavoriteCast("");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    }
  }

  if (status === "success") {
    return (
      <div className="relative rounded-3xl bg-toss-50 px-6 py-16 text-center">
        <Confetti count={22} />
        <div
          aria-hidden
          className="mx-auto w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl mb-5 shadow-sm"
        >
          💌
        </div>
        <h3 className="text-[20px] font-bold text-cheeze-ink mb-2">
          잘 받았어요
        </h3>
        <p className="text-[14px] text-cheeze-ink-soft max-w-sm mx-auto leading-relaxed">
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
    <form onSubmit={onSubmit} className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-[24px] font-bold tracking-tight text-cheeze-ink">
          응원 한마디
        </h2>
        <p className="mt-1.5 text-[14px] text-cheeze-ink-soft">
          익명도 환영. 한 줄 인사부터 깊은 후기까지 — 뭐든 좋아요.
        </p>
      </div>

      {/* Identity card */}
      <div className="rounded-2xl bg-toss-50 p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="닉네임"
            required
            name="nickname"
            maxLength={30}
            placeholder="치필러"
          />
          <Field
            label="이메일"
            sublabel="(선택)"
            name="email"
            type="email"
            placeholder="답장 원하면 적어주세요"
          />
        </div>
      </div>

      {/* Favorite member picker */}
      <div className="rounded-2xl bg-toss-50 p-5">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="text-[13px] font-semibold text-cheeze-ink">
              좋아하는 배우
            </div>
            <div className="text-[12px] text-cheeze-ink-soft mt-0.5">
              선택 안 해도 OK — 한 명을 골라주면 더 빠르게 전달돼요.
            </div>
          </div>
          {favoriteCast && (
            <button
              type="button"
              onClick={() => setFavoriteCast("")}
              className="text-[12px] font-semibold text-cheeze-ink-soft hover:text-cheeze-ink"
            >
              선택 해제
            </button>
          )}
        </div>
        {castChoices.length === 0 ? (
          <div className="text-[13px] text-cheeze-ink-soft italic px-1 py-3">
            아직 등록된 배우 사진이 없어요. 메시지만 보내주셔도 좋아요.
          </div>
        ) : (
          // Phone (<640px) shows 2 columns so each 3:4 portrait card lands
          // ~42vw wide instead of ~26vw — large enough that the cast photo
          // reads clearly and the tap target comfortably exceeds 44px.
          <ul className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {castChoices.map((c) => {
              const active = favoriteCast === c.name;
              return (
                <li key={c.name}>
                  <button
                    type="button"
                    onClick={() =>
                      setFavoriteCast(active ? "" : c.name)
                    }
                    aria-pressed={active}
                    className={`group block w-full text-left transition ${
                      active
                        ? "opacity-100"
                        : favoriteCast
                          ? "opacity-50 hover:opacity-100"
                          : "opacity-100"
                    }`}
                  >
                    <div
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-toss-100 transition ${
                        active
                          ? "ring-2 ring-cheeze-purple ring-offset-2 ring-offset-toss-50"
                          : ""
                      }`}
                    >
                      {c.photoUrl ? (
                        <Image
                          src={c.photoUrl}
                          alt={c.name}
                          fill
                          sizes="(min-width: 768px) 12vw, (min-width: 640px) 18vw, 30vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center text-[24px] font-bold text-cheeze-ink-soft">
                          {c.name.charAt(0)}
                        </div>
                      )}
                      {active && (
                        <span
                          aria-hidden
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-cheeze-purple text-white text-[12px] grid place-items-center shadow"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-[13px] font-semibold text-cheeze-ink truncate">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-cheeze-ink-soft truncate">
                        {c.roleLabel}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Message box */}
      <div className="rounded-2xl bg-toss-50 p-5">
        <label className="block">
          <div className="text-[13px] font-semibold text-cheeze-ink mb-2">
            응원 메시지 <span className="text-cheeze-purple">*</span>
          </div>
          <textarea
            name="message"
            rows={6}
            required
            maxLength={2000}
            placeholder="치즈필름에게 하고 싶은 말을 자유롭게."
            className="w-full bg-white rounded-xl px-4 py-3 text-[15px] text-cheeze-ink placeholder:text-toss-300 outline-none focus:ring-2 focus:ring-cheeze-purple/30 transition"
          />
        </label>
      </div>

      {status === "error" && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-[14px] text-rose-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
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

function Field({
  label,
  sublabel,
  name,
  type = "text",
  required = false,
  maxLength,
  placeholder,
}: {
  label: string;
  sublabel?: string;
  name: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="text-[13px] font-semibold text-cheeze-ink mb-1.5">
        {label}
        {required && <span className="text-cheeze-purple ml-1">*</span>}
        {sublabel && (
          <span className="text-cheeze-ink-soft font-normal ml-1.5">
            {sublabel}
          </span>
        )}
      </div>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full bg-white rounded-xl px-4 py-3 text-[15px] text-cheeze-ink placeholder:text-toss-300 outline-none focus:ring-2 focus:ring-cheeze-purple/30 transition"
      />
    </label>
  );
}
