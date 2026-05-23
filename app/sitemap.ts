import type { MetadataRoute } from "next";
import { getMembers } from "@/lib/members";
import { getAllListings } from "@/lib/auditionListings";

/**
 * Dynamic sitemap — V2 is the canonical surface. We list V2 routes
 * (root, members index, support, videos) plus per-member detail pages
 * and currently-public audition listings. V1 stays crawlable but at
 * lower priority since V2 is the destination we're promoting.
 *
 * `lastModified` uses real signals where we have them: member rows
 * don't track an `updated_at` so we fall back to `now()`; listings
 * carry `updated_at` in the DB.
 *
 * Disable static generation — listings change as admins post/close
 * them, and we want a fresh snapshot per crawl.
 */
export const dynamic = "force-dynamic";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cheezefilm.kr"
).replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // V2 routes — the main surface.
  const v2: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/v2`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/v2/members`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/v2/videos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/v2/support`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/v2/careers`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Per-member detail pages. Photos surface as image sitemap entries so
  // Google Image can crawl them.
  let members: MetadataRoute.Sitemap = [];
  try {
    const allMembers = await getMembers();
    members = allMembers.map((m) => ({
      url: `${SITE_URL}/v2/members/${encodeURIComponent(m.slug)}`,
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

  return [...v2, ...members, ...listings];
}
