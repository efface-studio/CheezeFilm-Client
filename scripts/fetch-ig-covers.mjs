#!/usr/bin/env node
/**
 * Fetch Instagram post cover images and save them to /public/covers/.
 *
 * Usage:
 *   node scripts/fetch-ig-covers.mjs <post_url> [<post_url> ...]
 *
 * Examples:
 *   node scripts/fetch-ig-covers.mjs https://www.instagram.com/p/C0VpkxIL5J9/
 *
 * What it does — and what it can't:
 *   ✓ For each post URL, fetches `/embed/` (works without auth, returns
 *     the post image URL inside SSR HTML).
 *   ✓ Picks the 1080w variant when available, downloads it.
 *   ✓ Saves to /public/covers/ig-<shortcode>.{jpg|webp}.
 *   ✗ Cannot LIST recent posts from a profile (Instagram blocks that
 *     without login). You must provide post URLs explicitly.
 *   ✗ Cannot detect "is this a group photo with 4+ people" — that's an
 *     image-content question, not a fetch one. Curate after download.
 *
 * Re-running is idempotent: skips files that already exist.
 */
import fs from "node:fs";
import path from "node:path";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IMG_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

const DEST_DIR = path.join(process.cwd(), "public", "covers");
fs.mkdirSync(DEST_DIR, { recursive: true });

function shortcodeFrom(url) {
  // Matches /p/<code>/, /reel/<code>/, /tv/<code>/.
  const m = url.match(/\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, "/");
}

/**
 * Pull the largest post image URL out of an `/embed/` page. The post
 * image is served from `scontent*.cdninstagram.com/v/t51.82787-15/...`
 * (the `t51.82787-15` segment is the post-image media bucket — distinct
 * from `t51.2885-19` which is profile pics).
 *
 * Ranking (best → worst):
 *   1. URL without an `stp=` query param  ─ original full size
 *   2. URL with `stp=…_s1080x1080`        ─ 1080×1080 variant
 *   3. URL with `stp=…_s750x750`          ─ 750×750
 *   4. URL with `stp=…_s640x640`          ─ 640×640
 *   5. Any other variant                  ─ likely tiny thumbnail
 *
 * Multi-image carousels return URLs with multiple distinct filename
 * stems (the part before `_n.webp`). We only return the FIRST stem's
 * largest variant; carousel pagination would need a different approach
 * (probably needs the GraphQL API + auth).
 */
function pickPostImageUrl(html) {
  const all = [...html.matchAll(/https:\/\/scontent[^"\\ ]*?t51\.82787-15[^"\\ ]*/g)]
    .map((m) => decode(m[0]));
  if (all.length === 0) return null;

  // Group by media filename stem (the bit before `_n.<ext>`), keep the
  // first stem only — that's the post's primary image (or the first slide
  // of a carousel).
  const firstStem = all[0].match(/\/(\d+_\d+_\d+_n)\./)?.[1];
  if (!firstStem) return all[0]; // shape changed — just use whatever's first
  const variants = all.filter((u) => u.includes(firstStem));

  // Best = no `stp` param (= full original)
  const noStp = variants.find((u) => !/[?&]stp=/.test(u));
  if (noStp) return noStp;

  // Otherwise pick the largest declared size.
  const sized = variants
    .map((u) => {
      const m = u.match(/_s(\d+)x\d+/);
      return { u, size: m ? parseInt(m[1], 10) : 0 };
    })
    .sort((a, b) => b.size - a.size);
  return sized[0]?.u ?? variants[0];
}

async function fetchOne(postUrl) {
  const code = shortcodeFrom(postUrl);
  if (!code) {
    console.error(`  ✗ Could not parse shortcode from: ${postUrl}`);
    return;
  }

  // Detect existing file with matching prefix (any extension).
  const existing = fs
    .readdirSync(DEST_DIR)
    .find((f) => f.startsWith(`ig-${code}.`));
  if (existing) {
    console.log(`  · skip ig-${code} (already saved as ${existing})`);
    return;
  }

  const embedUrl = `https://www.instagram.com/p/${code}/embed/`;
  const res = await fetch(embedUrl, { headers: { "User-Agent": MOBILE_UA } });
  if (!res.ok) {
    console.error(`  ✗ ig-${code}: embed page returned ${res.status}`);
    return;
  }
  const html = await res.text();
  const imageUrl = pickPostImageUrl(html);
  if (!imageUrl) {
    console.error(`  ✗ ig-${code}: no post image URL in embed page (deleted? private?)`);
    return;
  }

  const imgRes = await fetch(imageUrl, { headers: { "User-Agent": IMG_UA } });
  if (!imgRes.ok) {
    console.error(`  ✗ ig-${code}: image download returned ${imgRes.status}`);
    return;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length < 5_000) {
    console.error(`  ✗ ig-${code}: image suspiciously small (${buf.length}b), skipping`);
    return;
  }
  // Reels return a 10–11KB / 240×240 placeholder square instead of a real
  // post photo. The byte cutoff catches the obvious ones; anything that
  // squeaks through, we'll inspect dimensions below.
  if (buf.length < 15_000) {
    console.error(
      `  ✗ ig-${code}: looks like the IG placeholder thumbnail (${buf.length}b). ` +
        `This is usually a reel — embed pages don't expose its real cover.`,
    );
    return;
  }
  const ext = (imgRes.headers.get("content-type") || "").includes("webp")
    ? "webp"
    : "jpg";
  const file = path.join(DEST_DIR, `ig-${code}.${ext}`);
  fs.writeFileSync(file, buf);
  console.log(
    `  ✓ ig-${code}.${ext}  (${Math.round(buf.length / 1024)} KB)`,
  );
}

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Usage: node scripts/fetch-ig-covers.mjs <post_url> [...]");
  process.exit(1);
}
console.log(`Fetching ${urls.length} post(s) → ${DEST_DIR}`);
for (const url of urls) {
  await fetchOne(url);
}
