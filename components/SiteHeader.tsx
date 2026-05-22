"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/v1#story", label: "소개" },
  { href: "/videos", label: "영상" },
  { href: "/members", label: "멤버" },
  { href: "/v1#cast", label: "제작진" },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-cheeze-ink bg-cheeze-cream">
      <div className="slate-top" aria-hidden />
      <div className="mx-auto max-w-6xl px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
        <Link
          href="/v1"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 group min-w-0"
        >
          <span
            aria-hidden
            className="inline-flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-cheeze-purple border-2 border-cheeze-purple-deep overflow-hidden shadow-[3px_3px_0_var(--cheeze-purple-deep)] group-hover:rotate-12 transition-transform"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/cheeze-logo.png"
              alt="CheezeFilm logo"
              className="w-full h-full object-cover"
            />
          </span>
          <div className="leading-none min-w-0">
            <div
              className="font-display text-xl sm:text-2xl tracking-tight text-cheeze-ink"
              style={{ fontFamily: "var(--font-display)" }}
            >
              치즈필름
            </div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-olive truncate">
              Cheeze Film Studio
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-bold uppercase tracking-widest">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 hover:bg-cheeze-purple hover:text-cheeze-yellow"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/support" className="btn-yellow ml-2 text-sm">
            지원하기 →
          </Link>
        </nav>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/support"
            className="btn-yellow text-xs px-3 py-2"
            onClick={() => setMenuOpen(false)}
          >
            지원
          </Link>
          <button
            type="button"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 grid place-items-center border-2 border-cheeze-purple-deep bg-cheeze-cream hover:bg-cheeze-purple hover:text-cheeze-yellow"
          >
            <span className="sr-only">메뉴</span>
            <span aria-hidden className="flex flex-col gap-[3px]">
              <span
                className={`block w-5 h-[2px] bg-cheeze-ink transition-transform ${
                  menuOpen ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`block w-5 h-[2px] bg-cheeze-ink transition-opacity ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`block w-5 h-[2px] bg-cheeze-ink transition-transform ${
                  menuOpen ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t-2 border-cheeze-purple-deep bg-cheeze-cream-deep">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 border-b border-cheeze-purple-deep/15 font-bold uppercase tracking-widest text-sm"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/support"
              onClick={() => setMenuOpen(false)}
              className="py-3 font-bold uppercase tracking-widest text-sm text-cheeze-purple"
            >
              지원하기 →
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
