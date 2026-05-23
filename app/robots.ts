import type { MetadataRoute } from "next";

/**
 * robots.txt — allow the public site, block /admin (auth-gated UI) and
 * /api (internal JSON). Sitemap is announced so crawlers can pick it up
 * without us submitting it manually.
 */
const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cheezefilm.kr"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
