"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Search + export toolbar for the audition / fan-message tabs.
 *
 * Search is purely client-side — we don't refetch from the server. The
 * `data-aud-row` / `data-fan-row` attributes on each row carry the searchable
 * blob (`name email intro …`); we toggle `display: none` on rows that don't
 * match. Tiny DOM cost, no extra network.
 *
 * Export menu offers CSV, Excel (xlsx), and PDF (browser print-to-PDF via a
 * print-friendly page that auto-fires the print dialog). The PDF route is
 * audition-only — fan messages stay CSV/Excel.
 */
export default function AdminListToolbar({
  scope,
  total,
}: {
  scope: "audition" | "fan";
  total: number;
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
            className="w-full h-10 rounded-lg border border-zinc-200 bg-white pl-9 pr-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors placeholder:text-zinc-400 hover:border-zinc-300"
          />
          {/* Inline SVG glyph — keeps the look consistent with the rest of
              the admin shell (Pretendard + monochrome) instead of relying
              on a font-emoji that varies per platform. */}
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="8.5" cy="8.5" r="5" />
            <path d="M13 13l4 4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-zinc-500 tabular-nums font-medium">
          {q ? `${shown} / ${total} 건` : `${total} 건`}
        </span>
        <ExportMenu scope={scope} />
      </div>
    </div>
  );
}

/**
 * Toss-style dropdown — a single bold primary trigger, then a roomy menu
 * of formats with icon + label + tiny hint. Click-outside / Esc closes.
 */
function ExportMenu({ scope }: { scope: "audition" | "fan" }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const csvHref = `/api/admin/export?type=${scope === "audition" ? "auditions" : "fan"}&format=csv`;
  const xlsxHref = `/api/admin/export?type=${scope === "audition" ? "auditions" : "fan"}&format=xlsx`;
  const pdfHref = scope === "audition" ? "/admin/auditions/print" : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-zinc-900 text-white text-[13px] font-bold hover:bg-zinc-800 active:scale-[0.98] transition-all"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 2v8m0 0l-3-3m3 3l3-3M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        내보내기
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path d="M5 7l5 6 5-6z" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-zinc-100 overflow-hidden z-30 origin-top-right animate-[fadeInDown_120ms_ease-out]"
        >
          <MenuItem
            href={csvHref}
            mark="CSV"
            label="CSV"
            hint="모든 도구가 여는 표준 텍스트"
            download
            onSelect={() => setOpen(false)}
          />
          <MenuItem
            href={xlsxHref}
            mark="XLS"
            label="Excel"
            hint="서식 포함된 정식 엑셀 파일"
            download
            onSelect={() => setOpen(false)}
          />
          {pdfHref && (
            <MenuItem
              href={pdfHref}
              mark="PDF"
              label="PDF로 인쇄"
              hint="새 탭에서 인쇄 대화상자 자동 호출"
              target="_blank"
              onSelect={() => setOpen(false)}
            />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function MenuItem({
  href,
  mark,
  label,
  hint,
  download,
  target,
  onSelect,
}: {
  href: string;
  /** Compact 3-letter format tag rendered as a monospace chip. */
  mark: string;
  label: string;
  hint: string;
  download?: boolean;
  target?: string;
  onSelect: () => void;
}) {
  return (
    <a
      href={href}
      download={download}
      target={target}
      rel={target === "_blank" ? "noreferrer" : undefined}
      onClick={onSelect}
      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 transition-colors"
      role="menuitem"
    >
      <span
        aria-hidden
        className="w-10 h-7 rounded-md bg-zinc-100 grid place-items-center text-[10px] font-mono font-bold text-zinc-700 tracking-wider"
      >
        {mark}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-zinc-900">{label}</span>
        <span className="block text-[11px] text-zinc-500 mt-0.5">
          {hint}
        </span>
      </span>
    </a>
  );
}
