"use client";

import { useState } from "react";
import V2AuditionForm from "./V2AuditionForm";
import V2FanForm from "./V2FanForm";

type Tab = "audition" | "fan";

/**
 * /support tabs — Toss-style segmented pill.
 *
 *   - Container is a single rounded pill filled with `cheeze-cream-deep`.
 *   - Active tab is a white pill that floats inside, with a faint shadow
 *     so it reads as "lifted" from the trough.
 *   - Inactive tab is just tinted text — no border, no second fill —
 *     so the eye lands on the active one immediately.
 *
 * Labels switch to friendly Korean ("오디션", "응원 보내기") since the
 * page hero already carries the English/editorial framing.
 */
export type CastChoice = {
  name: string;
  photoUrl: string | null;
  roleLabel: string;
};

export default function V2SupportTabs({
  initialTab,
  favoriteCastChoices,
}: {
  initialTab: Tab;
  favoriteCastChoices: CastChoice[];
}) {
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div>
      {/* Fixed-width 2-column grid so the floating white pill no longer
          shifts left/right as label widths differ. Both columns hold
          the longest label width, so swapping tabs is a pure fill swap. */}
      <div
        role="tablist"
        aria-label="지원 종류 선택"
        className="inline-grid grid-cols-2 gap-1 p-1 rounded-full bg-toss-100 mb-10 w-[280px]"
      >
        <TabButton
          active={tab === "audition"}
          onClick={() => setTab("audition")}
          label="오디션"
        />
        <TabButton
          active={tab === "fan"}
          onClick={() => setTab("fan")}
          label="응원 보내기"
        />
      </div>

      {tab === "audition" ? (
        <V2AuditionForm onSwitchToFan={() => setTab("fan")} />
      ) : (
        <V2FanForm castChoices={favoriteCastChoices} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`w-full text-center px-5 py-2 rounded-full text-[14px] font-semibold transition-all ${
        active
          ? "bg-white text-cheeze-ink shadow-sm"
          : "text-cheeze-ink-soft/70 hover:text-cheeze-ink"
      }`}
    >
      {label}
    </button>
  );
}
