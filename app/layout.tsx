import type { Metadata } from "next";
import "./globals.css";
import CursorSpotlight from "@/components/CursorSpotlight";
import PageTransition from "@/components/PageTransition";

// next/font imports for Gowun_Dodum and Black_Han_Sans were removed —
// after the Toss redesign every JSX call site that hard-codes
// `style={{ fontFamily: "var(--font-display)" }}` resolves to Pretendard
// (see `globals.css` :root → `--font-sans` / `--font-display`). The
// `--font-gowun-dodum` / `--font-black-han-sans` CSS variables were
// never referenced anywhere, so `next/font` was emitting two font
// subsets on every page for no visible effect. Removing them trims
// ~50KB of build-time woff2 emission and skips the per-page
// `<link rel="preload">` injection that next/font would otherwise add.

// Canonical origin for og:image, twitter cards, and the sitemap. Override
// with NEXT_PUBLIC_SITE_URL once we know the production domain.
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cheezefilm.kr"
).replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "치즈필름 | CheezeFilm — 스토리를 굽는 사람들",
    template: "%s | 치즈필름",
  },
  description:
    "웹드라마 스튜디오 치즈필름의 공식 팬 사이트. 332만 구독자가 사랑한 작품들, 그리고 오디션·응원 메시지를 받는 공간.",
  applicationName: "치즈필름",
  keywords: [
    "치즈필름",
    "CheezeFilm",
    "웹드라마",
    "일진에게 찍혔을 때",
    "일진에게 반했을 때",
    "스튜디오 치즈",
    "한국 웹드라마",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "치즈필름 — 스토리를 굽는 사람들",
    description:
      "「일진에게 찍혔을 때」, 「일진에게 반했을 때」를 만든 스튜디오 치즈필름.",
    type: "website",
    siteName: "치즈필름",
    locale: "ko_KR",
    url: "/",
    images: [
      {
        url: "/cheeze-logo.png",
        width: 1200,
        height: 630,
        alt: "치즈필름 — CheezeFilm",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "치즈필름 — 스토리를 굽는 사람들",
    description:
      "「일진에게 찍혔을 때」, 「일진에게 반했을 때」를 만든 스튜디오 치즈필름.",
    images: ["/cheeze-logo.png"],
  },
  // Favicons / app icons are picked up automatically by Next.js from
  // `app/icon.png` and `app/apple-icon.png` (both derived from
  // `cheeze-logo.png`). No manual `icons` field needed.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        {/* Resource hints — give the browser a head start on hosts we know
            we'll hit. preconnect actually opens a TCP+TLS handshake early
            (so the first real request skips ~100–300ms of round-trip);
            dns-prefetch is the cheaper fallback for hosts we may not even
            use on every page. */}
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        {/* i.ytimg.com promoted from dns-prefetch → preconnect: every
            video card on /, /videos, /admin loads its thumbnail from
            here, so opening the TLS connection eagerly trims the LCP
            on the films grid. */}
        <link
          rel="preconnect"
          href="https://i.ytimg.com"
          crossOrigin="anonymous"
        />
        {/* Same for the Supabase Storage origin — member portraits,
            cover photos, and audition uploads all hit it. Read the
            project URL from the public env var; if missing (e.g. local
            dev without .env.local set) we just skip the hint. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <link
            rel="preconnect"
            href={process.env.NEXT_PUBLIC_SUPABASE_URL}
            crossOrigin="anonymous"
          />
        )}
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://scontent.cdninstagram.com" />
      </head>
      {/*
        Note: body uses normal block flow, NOT `flex flex-col`. With flex-col,
        a child `<section className="mx-auto max-w-6xl">` would shrink to its
        content width because mx-auto overrides flex's default stretch — that
        was making the recent-longform grid render at ~520px on a 1280px
        viewport instead of using the full max-w-6xl. Block flow lets sections
        naturally take the body width and then mx-auto centers within max-w.
      */}
      <body className="min-h-screen">
        <CursorSpotlight />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
