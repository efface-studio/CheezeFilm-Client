"use client";

import { useState } from "react";

/**
 * Search + export toolbar for the audition / fan-message tabs.
 *
 * Search is purely client-side — we don't refetch from the server. The
 * `data-aud-row` / `data-fan-row` attributes on each row carry the searchable
 * blob (`name email intro …`); we toggle `display: none` on rows that don't
 * match. Tiny DOM cost, no extra network.
 */
export default function AdminListToolbar({
  scope,
  total,
  exportHref,
}: {
  scope: "audition" | "fan";
  total: number;
  exportHref: string;
}) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(total);
  const rowSelector = scope === "audition" ? "[data-aud-row]" : "[data-fan-row]";
  const blobAttr = scope === "audition" ? "data-aud-search" : "data-fan-search";

  function onInput(value: string) {
    setQ(value);
    const needle = value.trim().toLowerCase();
    const rows = document.querySelectorAll<HTMLElement>(rowSelector);
    let visible = 0;
    rows.forEach((row) => {
      const blob = (row.getAttribute(blobAttr) ?? "").toLowerCase();
      const match = needle === "" || blob.includes(needle);
      row.style.display = match ? "" : "none";
      if (match) visible++;
    });
    setShown(visible);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <input
            type="search"
            value={q}
            onChange={(e) => onInput(e.target.value)}
            placeholder={
              scope === "audition"
                ? "이름·이메일·자기소개로 검색"
                : "닉네임·메시지로 검색"
            }
            className="w-full rounded-md border border-zinc-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
            🔍
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 tabular-nums">
          {q ? `${shown} / ${total} 건 표시` : `${total} 건`}
        </span>
        <a
          href={exportHref}
          download
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded border border-zinc-300 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          ⤓ CSV 내보내기
        </a>
      </div>
    </div>
  );
}
