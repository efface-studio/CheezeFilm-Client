import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],

  // ── Dev mode UI ───────────────────────────────────────
  // Hide the bottom-left Next.js "N" route/build indicator. It's a
  // dev-only overlay (doesn't ship to prod), but it covered the V2
  // hero corner and confused the brand identity at a glance.
  devIndicators: false,

  // ── Image optimization ────────────────────────────────
  // Allow remote image hosts we render via <Image> — YouTube thumbs and
  // Instagram CDN (member portraits we fetch + cache to local disk).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      // Supabase Storage — every member portrait, cover photo, and reel
      // mp4 thumbnail is served from a project-specific subdomain.
      { protocol: "https", hostname: "*.supabase.co" },
    ],
    // AVIF first → WebP → JPEG fallback. AVIF is 30-50% smaller than
    // WebP for photo content; both supported by all modern browsers.
    formats: ["image/avif", "image/webp"],
    // Allow the two quality settings we actually use. Next.js 16
    // started warning when an `<Image quality>` value falls outside
    // the configured list; 75 is the default and 85 is what the
    // higher-fidelity thumbnails ask for.
    qualities: [75, 85],
    // Optimized image cache TTL (Vercel CDN respects this).
    minimumCacheTTL: 60 * 60 * 24, // 24h
  },

  async headers() {
    return [
      // ── Security headers — every response ─────────────
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // Lock down every powerful feature we don't actually use.
            // Same posture as before plus payment, USB, serial, sensors,
            // FLoC ancestor topics — defensive defaults so a future page
            // can't quietly opt in without an explicit policy review.
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "browsing-topics=()",
              "payment=()",
              "usb=()",
              "serial=()",
              "accelerometer=()",
              "gyroscope=()",
              "magnetometer=()",
              "interest-cohort=()",
            ].join(", "),
          },
          // CSP — allows our own assets + ytimg thumbnails + YouTube embeds +
          // Pretendard CDN + Google Fonts. Tightened beyond Next's defaults.
          //
          // Notable choices:
          //   - `script-src` requires BOTH `'unsafe-inline'` AND
          //     `'unsafe-eval'`, even in production. React 19's streaming
          //     SSR injects an inline bootstrap script that defines
          //     `$RC` / `$RS` (the runtime helpers that swap each
          //     Suspense boundary's fallback for its resolved content)
          //     via `new Function(...)`. Without `'unsafe-eval'` those
          //     helpers can't be created → every Suspense boundary on
          //     the page stays stuck on its fallback forever, which is
          //     what we observed on `/` (FilmsGrid, ShortsStripSection,
          //     LiveStatsBar all showed their skeletons indefinitely
          //     after PR #71 dropped 'unsafe-eval' from prod).
          //   - `'unsafe-inline'` is needed because Next + React inline
          //     the bootstrap as a literal `<script>` tag; replacing it
          //     with nonces would require per-request CSP injection via
          //     middleware. Not worth the complexity for the marginal
          //     XSS reduction over 'unsafe-inline'.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
              "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
              // Instagram CDN added so member portraits can render even when
              // we fall back to remote URLs during dev.
              "img-src 'self' data: blob: https://i.ytimg.com https://yt3.ggpht.com https://yt3.googleusercontent.com https://*.cdninstagram.com https://*.supabase.co",
              "media-src 'self' https://*.supabase.co",
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com",
              "connect-src 'self' https://www.youtube.com https://www.googleapis.com https://*.supabase.co",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
              "object-src 'none'",
              // Block plugins / Flash / etc. and prevent the page from
              // upgrading itself into a context that ignores CSP.
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },

      // ── Long-lived cache for user-uploaded photos ─────
      // Member portraits & audition profile shots are stable between
      // explicit replacements. 1 hour fresh + stale-while-revalidate
      // gives instant repeat visits without locking in stale uploads.
      {
        source: "/members/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/auditions/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        // Reels — videos pulled from IG once and served as static MP4s.
        // Long cache since we don't re-pull them often.
        source: "/reels/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },

      // ── Brand assets — long cache ─────────────────────
      {
        source: "/cheeze-logo.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/cheese-cursor.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/cheese-cursor-pointer.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  // V2 was promoted out of `/v2` and lives at the root now (#45). Catch
  // every legacy `/v2*` URL with a permanent redirect so external links
  // and search-engine indexes keep working. `:path*` includes the empty
  // case, so plain `/v2` also lands on `/`.
  async redirects() {
    return [
      { source: "/v2", destination: "/", permanent: true },
      { source: "/v2/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
