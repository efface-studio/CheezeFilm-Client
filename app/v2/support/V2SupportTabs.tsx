"use client";

import { useState } from "react";
import V2AuditionForm from "./V2AuditionForm";
import V2FanForm from "./V2FanForm";

type Tab = "audition" | "fan";

export default function V2SupportTabs({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div>
      {/* Segmented control */}
      <div className="inline-flex border border-cheeze-purple-deep mb-10">
        <button
          type="button"
          onClick={() => setTab("audition")}
          className={`px-5 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors ${
            tab === "audition"
              ? "bg-cheeze-purple-deep text-cheeze-yellow"
              : "text-cheeze-purple-deep hover:bg-cheeze-purple-deep/10"
          }`}
        >
          Audition
        </button>
        <button
          type="button"
          onClick={() => setTab("fan")}
          className={`px-5 py-2.5 text-xs font-bold tracking-widest uppercase border-l border-cheeze-purple-deep transition-colors ${
            tab === "fan"
              ? "bg-cheeze-purple-deep text-cheeze-yellow"
              : "text-cheeze-purple-deep hover:bg-cheeze-purple-deep/10"
          }`}
        >
          Fan Letter
        </button>
      </div>

      {tab === "audition" ? <V2AuditionForm /> : <V2FanForm />}
    </div>
  );
}
