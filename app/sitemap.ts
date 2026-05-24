import type { MetadataRoute } from "next";
import { getMembers } from "@/lib/members";
import { getAllListings } from "@/lib/auditionListings";

/**
 * Dynamic sitemap. The site lives at the root path now (V1 was retired
 * in #26 and the home was reorganised in #45), so every URL here is
 * a top-level path. We list the main routes (root, members index,
 * support, videos, careers) plus per-member detail pages and
 * currently-public audition listings.
 *
 * `lastModified` uses real signals where we have them: member rows
 * don't track an `updated_at` so we fall back to `now()`; listings
 * carry `updated_at` in the DB.
 *
 * Cache for an hour. Crawlers don't need second-precise sitemaps,
 * and the underlying `getMembers` / `getAllListings` are themselves
 * `unstable_cache`-wrapped (revalidated via tags on admin mutations).
 * Using ISR here saves a couple of Supabase roundtrips per crawl.
 */
export const revalidate = 3600;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cheezefilm.kr"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const main: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/members`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/videos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/support`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/careers`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Per-member detail pages.
  let members: MetadataRoute.Sitemap = [];
  try {
    const allMembers = await getMembers();
    members = allMembers.map((m) => ({
      url: `${SITE_URL}/members/${encodeURIComponent(m.slug)}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }));
  } catch {
    // If the DB is unreachable during build, ship the static URLs anyway
    // rather than failing the whole sitemap.
    members = [];
  }

  // Audition listings — only ones still visible publicly.
  let listings: MetadataRoute.Sitemap = [];
  try {
    const allListings = await getAllListings();
    listings = allListings
      .filter((l) => l.status === "open")
      .map((l) => ({
        url: `${SITE_URL}/support?listing=${l.id}`,
        lastModified: l.updated_at ? new Date(l.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      }));
  } catch {
    listings = [];
  }

  return [...main, ...members, ...listings];
}
