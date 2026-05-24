# 🧀 CheezeFilm — Official-style fan site

The fan + audition site for **CheezeFilm** (`@CheezeFilmz`), a Korean web-drama studio with **3.45M+ subscribers**.

The site is the channel's public storefront (story, cast, films, careers) and the studio's operations panel: open-audition application intake, fan-letter inbox, member / content management, all in one place.

> Live: <https://cheeze.efface.dev>

---

## Stack

- **Next.js 16** (App Router, React Server Components, Suspense streaming) on **React 19**
- **TypeScript 5** strict
- **Tailwind v4** (Lightning CSS) — Toss-inspired surface
- **Supabase** — Postgres (auditions, fan_messages, members, audition_listings, site_content) + Storage (member portraits, cover photos, audition profile photos, reel MP4s)
- **YouTube Data API v3** with RSS fallback for the channel feed
- **ISR + `unstable_cache` + `revalidateTag`** for every public route; admin mutations flush surgically
- **Vercel** hosting

## Public routes

| Route | Purpose | Caching |
|---|---|---|
| `/` | Home — hero cover slideshow, live channel stats, featured cast, films grid, shorts strip, careers teaser | ISR 5m + Suspense streaming for the slow YouTube fetch |
| `/videos` | Full filmography — long-form + shorts tabs with title/description search | ISR 1h + Suspense streaming |
| `/members` | Cast & crew gallery with per-member detail pages | ISR 5m |
| `/members/[slug]` | Member detail | ISR 5m, SSG for all known slugs |
| `/careers` | Open positions, audition reel, apply CTA | ISR 5m |
| `/support` | Audition application form **and** fan-letter form | ISR 1m |
| `/sitemap.xml` | Dynamic sitemap of all members + active listings | ISR 1h |

The hero stats bar, films grid, and shorts strip on `/` are wrapped in `<Suspense>` boundaries so the page shell paints in ~100ms while the slow `getAllVideos()` HEAD-probes 500+ videos in the background.

## Admin (`/admin`)

Cookie-based session login (`SESSION_SECRET` env var), then a tabbed dashboard:

| Tab | What it does |
|---|---|
| **대시보드** | KPI cards + 7-day trend + pending-review queue + unread fan messages |
| **이번 호 표지** | Hero cover photo uploader (up to 10) + fallback YouTube video picker |
| **지원 공고** | CRUD on open audition / staff listings — drives the `/support` form's role chips |
| **오디션 지원** | Audition applications table with status workflow (대기 → 검토중 → 합격 / 불합격) + CSV export |
| **응원 메시지** | Fan letters inbox with read / unread + reply-via-email |
| **멤버 관리** | Cast roster CRUD + Instagram photo auto-fetcher + YouTube channel cast-sync |
| **사이트 콘텐츠** | All editable hero / story / footer copy. Each key has a Korean **and** an English input — English defaults to a baked-in translation when blank |

Tab components are **dynamically imported** so a dashboard-only visit doesn't ship the 250 KB+ of CRUD JS for the other six tabs. Data fetching is **tab-aware**: each tab only queries what it needs.

## i18n (KO ⇄ EN)

A sidebar pill toggles between Korean and English. The preference lives in a `cf_lang` cookie (1y, lax) — no URL change, no route prefix.

Two layers of strings:

1. **`UI_STRINGS`** in [`lib/i18n.ts`](lib/i18n.ts) — ~150 hardcoded UI strings (nav, headings, button text, aria labels). Each entry has both `ko` and `en`. Looked up via `t(key, lang)`.
2. **Content registry** in [`lib/content.ts`](lib/content.ts) — every admin-editable string. Each entry has a Korean `fallback` and an optional `fallbackEn`; admins can override either via the **사이트 콘텐츠** tab. Resolved via `getContent(map, key, lang)` which walks: DB `${key}.en` → `fallbackEn` → DB `${key}` → `fallback`.

Reading the lang cookie opts public pages into dynamic rendering, but the data layer is still cached via `unstable_cache` so per-request work stays small.

## Run locally

```bash
# 1) Install
npm install

# 2) Create .env.local — see "Environment variables" below

# 3) Dev (port 3000, with Turbopack)
npm run dev

# 4) Production
npm run build && npm start
```

## Environment variables

Required:

| Var | Where to set | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public — shipped to the browser | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | anon key (RLS protects writes) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose | bypasses RLS for admin reads / writes |
| `SESSION_SECRET` | Server only | 32+ char random string for admin session cookie HMAC |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Server only | bcrypt-hashed password recommended in production |

Optional:

| Var | Effect |
|---|---|
| `YOUTUBE_API_KEY` | Without it, the channel feed falls back to RSS (last 15 videos only). With it, all 500+ uploads are listed |
| `NEXT_PUBLIC_SITE_URL` | Used by `metadata.metadataBase` + sitemap; defaults to `https://cheezefilm.kr` |

## Database

Schema lives in [`supabase/schema.sql`](supabase/schema.sql). Five tables:

- `auditions` — submissions from `/support?tab=audition`. Profile photos in Storage `auditions` bucket (up to 3 per applicant).
- `fan_messages` — submissions from `/support?tab=fan`.
- `members` — cast roster shown on `/members`. Photos in Storage `members` bucket.
- `audition_listings` — admin-created postings that populate the role chips on the audition form + the sidebar CTA state.
- `site_content` — `(key, value)` pairs that override the in-code content registry. English values are stored under `${key}.en`.

## Storage buckets

| Bucket | Contents | Cache TTL |
|---|---|---|
| `covers` | Hero cover photos | 24h |
| `members` | Cast portraits | 1h fresh + 24h SWR |
| `auditions` | Applicant profile photos | 1h fresh + 24h SWR |
| `reels` | MP4 videos pulled from Instagram once and cached | 24h fresh + 1w SWR |

## Performance

- **Suspense streaming** on `/` and `/videos` keeps the shell paint sub-100ms cold; slow YouTube data streams in.
- **Module-level memo** in [`lib/youtube.ts`](lib/youtube.ts) coalesces concurrent `getAllVideos()` calls into one network fetch.
- **Tab-aware data fetching** + **dynamic component imports** on `/admin`.
- **AVIF / WebP** auto-served by Next/Image with a 24h CDN cache.
- **Preconnect** hints in [`app/layout.tsx`](app/layout.tsx) for `i.ytimg.com`, Supabase, Pretendard CDN — TLS opens before the first thumbnail request.

## Security

- Cookie-based admin session signed with `SESSION_SECRET` (HMAC SHA-256).
- Tight CSP, X-Frame-Options SAMEORIGIN, Referrer-Policy strict-origin in [`next.config.ts`](next.config.ts).
- Server-only env vars never imported into client bundles; the i18n cookie reader lives in its own [`lib/i18n.server.ts`](lib/i18n.server.ts) to enforce that boundary.
- Supabase row-level security on every public table; the public site uses the anon key (read-only paths), the server uses the service role key.
- File uploads validate mime + size before persisting; admin-only mutation endpoints check session.

## Project layout

```
app/
  page.tsx                # Home (also exports SiteHeader / SiteFooter)
  layout.tsx              # Root layout, fonts, resource hints, metadata
  loading.tsx             # Global route-transition skeleton
  videos/                 # /videos route + grid + player modal
  members/                # /members + /members/[slug]
  careers/                # /careers
  support/                # /support audition + fan tabs
  admin/                  # All admin tabs + tools
  api/                    # Public + admin route handlers
components/
  SiteNav.tsx             # Sidebar rail + mobile top bar + lang toggle
  HeroCover.tsx           # Home hero slideshow
  Stagger.tsx             # Scroll-in reveal + character / word stagger
  LangToggle.tsx          # KO ⇄ EN cookie writer
  …
lib/
  i18n.ts                 # Dictionary + t() / tc() lookups
  i18n.server.ts          # Server-only cookie reader
  content.ts              # Editable content registry + getContent()
  youtube.ts              # Channel feed (Data API → RSS fallback)
  members.ts              # Member roster
  auditionListings.ts     # Open postings
  db.ts                   # Supabase clients
  auth.ts                 # Admin session
supabase/schema.sql       # Postgres tables + RLS
```

## License

Private project — UI design and code are not licensed for reuse without permission.
