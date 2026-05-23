"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  /**
   * Stored value, ISO-shaped:
   * - `YYYY-MM-DD` when `withTime` is false (default).
   * - `YYYY-MM-DDTHH:MM` when `withTime` is true.
   * `null` = unset.
   */
  value: string | null;
  onChange: (next: string | null) => void;
  placeholder?: string;
  className?: string;
  /** When true, the popover also exposes hour/minute selects and emits datetime. */
  withTime?: boolean;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KO = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_STEP = 5;
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

const POPOVER_WIDTH = 280;
// Approx popover height — used only to choose flip-up vs flip-down.
const POPOVER_HEIGHT_BASE = 340;
const POPOVER_HEIGHT_WITH_TIME = 400;

// SSR-safe layout effect — avoids the React warning during server render.
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Parsed = {
  date: Date | null;
  hour: number;
  minute: number;
};

function parseValue(str: string | null, withTime: boolean): Parsed {
  if (!str) return { date: null, hour: 0, minute: 0 };
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (dateOnly) {
    return {
      date: new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])),
      hour: 0,
      minute: 0,
    };
  }
  const dateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(str);
  if (dateTime) {
    return {
      date: new Date(
        Number(dateTime[1]),
        Number(dateTime[2]) - 1,
        Number(dateTime[3]),
      ),
      hour: withTime ? Number(dateTime[4]) : 0,
      minute: withTime ? Number(dateTime[5]) : 0,
    };
  }
  return { date: null, hour: 0, minute: 0 };
}

function format(d: Date, hour: number, minute: number, withTime: boolean): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (!withTime) return `${y}-${m}-${day}`;
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/**
 * Custom date (and optional time) picker. Renders the popover via a React
 * portal to `document.body` so it can escape parent `overflow: hidden|auto`
 * (admin modals, scroll containers). Positions itself with `position: fixed`
 * keyed to the trigger's bounding rect, and re-measures on scroll / resize.
 */
export default function DatePicker({
  value,
  onChange,
  placeholder,
  className = "",
  withTime = false,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Defer portal until after mount — server can't access document.
  useEffect(() => setMounted(true), []);

  const parsed = useMemo(() => parseValue(value, withTime), [value, withTime]);
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);
  const [viewMonth, setViewMonth] = useState<Date>(
    startOfMonth(parsed.date ?? today),
  );

  // Sync view month to incoming value (e.g. form reset).
  useEffect(() => {
    if (parsed.date) setViewMonth(startOfMonth(parsed.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Position the popover relative to the trigger, escaping any parent
  // clipping by rendering at the document root with fixed coordinates.
  useIsoLayoutEffect(() => {
    if (!open) return;
    function measure() {
      const t = triggerRef.current;
      if (!t) return;
      const rect = t.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const popH = withTime ? POPOVER_HEIGHT_WITH_TIME : POPOVER_HEIGHT_BASE;
      const below = vh - rect.bottom;
      const above = rect.top;
      const flipUp = below < popH && above > below;
      // Clamp so the popover always stays in the viewport with an 8px gutter.
      const top = flipUp
        ? Math.max(8, rect.top - popH - 4)
        : Math.min(vh - popH - 8, rect.bottom + 4);
      const left = Math.max(
        8,
        Math.min(vw - POPOVER_WIDTH - 8, rect.left),
      );
      setCoords({ top, left, width: POPOVER_WIDTH });
    }
    measure();
    // Capture-phase scroll listener picks up any scrolling ancestor — modals,
    // panels, the document itself — not just window scroll.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, withTime]);

  // Click-outside / Esc to close. The popover lives outside `wrapRef` in the
  // portal, so we also check against `popoverRef`.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !triggerRef.current?.contains(t) &&
        !popoverRef.current?.contains(t)
      ) {
        setOpen(false);
      }
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

  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const display = parsed.date
    ? withTime
      ? `${parsed.date.getFullYear()}. ${parsed.date.getMonth() + 1}. ${parsed.date.getDate()}. ${String(parsed.hour).padStart(2, "0")}:${String(parsed.minute).padStart(2, "0")}`
      : `${parsed.date.getFullYear()}. ${parsed.date.getMonth() + 1}. ${parsed.date.getDate()}.`
    : "";

  const effectivePlaceholder =
    placeholder ?? (withTime ? "연도. 월. 일. 시:분" : "연도. 월. 일.");

  function commitDate(d: Date) {
    onChange(format(d, parsed.hour, parsed.minute, withTime));
    // In date-only mode picking a day finishes the interaction. With time,
    // the user usually wants to adjust hour/minute next — stay open.
    if (!withTime) setOpen(false);
  }

  function commitTime(hour: number, minute: number) {
    const base = parsed.date ?? today;
    onChange(format(base, hour, minute, true));
  }

  const popover = (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="날짜 선택"
      style={
        coords
          ? {
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 60,
            }
          : { position: "fixed", visibility: "hidden", top: 0, left: 0 }
      }
      className="rounded-lg border border-zinc-200 bg-white shadow-lg p-3 select-none font-pretendard"
    >
      {/* Header — month nav */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          type="button"
          onClick={() => setViewMonth((d) => addMonths(d, -1))}
          className="w-7 h-7 rounded hover:bg-zinc-100 grid place-items-center text-zinc-600"
          aria-label="이전 달"
        >
          ‹
        </button>
        <div className="text-sm font-semibold text-zinc-900 tabular-nums">
          {viewMonth.getFullYear()}년 {MONTHS_KO[viewMonth.getMonth()]}
        </div>
        <button
          type="button"
          onClick={() => setViewMonth((d) => addMonths(d, 1))}
          className="w-7 h-7 rounded hover:bg-zinc-100 grid place-items-center text-zinc-600"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-[10px] uppercase tracking-wider font-semibold text-center py-1 ${
              i === 0
                ? "text-rose-500"
                : i === 6
                  ? "text-purple-600"
                  : "text-zinc-500"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const isOther = d.getMonth() !== viewMonth.getMonth();
          const isToday = sameDay(d, today);
          const isSelected = parsed.date ? sameDay(d, parsed.date) : false;
          const dow = d.getDay();
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => commitDate(d)}
              className={[
                "h-8 rounded text-xs tabular-nums transition-colors",
                isSelected
                  ? "bg-purple-600 text-white font-bold hover:bg-purple-700"
                  : isToday
                    ? "ring-1 ring-purple-300 text-purple-700 font-bold hover:bg-purple-50"
                    : isOther
                      ? "text-zinc-300 hover:bg-zinc-50"
                      : dow === 0
                        ? "text-rose-500 hover:bg-zinc-100"
                        : "text-zinc-700 hover:bg-zinc-100",
              ].join(" ")}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Time row */}
      {withTime && (
        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 w-12">
            시간
          </span>
          <select
            value={parsed.hour}
            onChange={(e) => commitTime(Number(e.target.value), parsed.minute)}
            className="flex-1 border border-zinc-300 rounded px-2 py-1 text-xs tabular-nums focus:outline-none focus:border-purple-500"
            aria-label="시"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}시
              </option>
            ))}
          </select>
          <select
            value={parsed.minute}
            onChange={(e) => commitTime(parsed.hour, Number(e.target.value))}
            className="flex-1 border border-zinc-300 rounded px-2 py-1 text-xs tabular-nums focus:outline-none focus:border-purple-500"
            aria-label="분"
          >
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, "0")}분
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          className="text-xs font-semibold text-zinc-500 hover:text-rose-600"
        >
          지우기
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setViewMonth(startOfMonth(today));
              onChange(format(today, parsed.hour, parsed.minute, withTime));
              if (!withTime) setOpen(false);
            }}
            className="text-xs font-semibold text-purple-700 hover:text-purple-900"
          >
            오늘
          </button>
          {withTime && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
            >
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field w-full text-left flex items-center justify-between gap-2"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className={display ? "text-zinc-900" : "text-zinc-400"}>
          {display || effectivePlaceholder}
        </span>
        <span className="text-zinc-500 text-base leading-none" aria-hidden>
          📅
        </span>
      </button>
      {open && mounted && createPortal(popover, document.body)}
    </div>
  );
}
