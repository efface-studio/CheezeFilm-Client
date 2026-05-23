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
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          // CSP — allows our own assets + ytimg thumbnails + YouTube embeds +
          // Pretendard CDN + Google Fonts. Tightened beyond Next's defaults.
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
