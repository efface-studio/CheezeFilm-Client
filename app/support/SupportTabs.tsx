"use client";

import { useState } from "react";
import AuditionForm from "./AuditionForm";
import FanForm from "./FanForm";

type Tab = "audition" | "fan";

export default function SupportTabs({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <section className="mx-auto max-w-4xl px-5 py-12">
      <div className="flex justify-center mb-10">
        <div className="tabbar shadow-[4px_4px_0_var(--cheeze-ink)]">
          <button
            type="button"
            data-active={tab === "audition"}
            onClick={() => setTab("audition")}
          >
            🎬 오디션 지원
          </button>
          <button
            type="button"
            data-active={tab === "fan"}
            onClick={() => setTab("fan")}
          >
            🧀 응원 메시지
          </button>
        </div>
      </div>

      <div className="poster p-6 md:p-10 noise-overlay">
        {tab === "audition" ? <AuditionForm /> : <FanForm />}
      </div>

      <div className="mt-10 text-center text-sm text-cheeze-ink-soft/80 leading-relaxed">
        ※ 보내주신 정보는 오디션 검토 및 응원 메시지 보관 목적 외에는 사용되지
        않습니다. <br />
        문의: cheezefilm.m@gmail.com
      </div>
    </section>
  );
}
