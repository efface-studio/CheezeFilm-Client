#!/usr/bin/env node
/**
 * One-shot SQLite → Supabase migration.
 *
 * Reads `data/cheezefilm.db` and pushes everything to the cheezefilm
 * Supabase project: 5 tables (members, audition_listings, auditions,
 * fan_messages, site_content) + all binary assets under `/public/{members,
 * covers,reels}` to the matching Storage buckets.
 *
 * Idempotent at the row level (upserts by primary key) so re-running on a
 * partially-populated DB just refreshes. Storage uploads use `upsert: true`
 * for the same reason.
 *
 * Required env in `.env.local`:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:  `node --env-file=.env.local scripts/migrate-to-supabase.mjs`
 */
import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Storage keys must be ASCII (`[a-zA-Z0-9!_.*'()-/]`). Some member slugs
 * are Korean (e.g. `주석`), so we map any non-ASCII stem to a stable
 * SHA-1-derived hex. ASCII stems keep their original name. The mapping
 * lives in `members.photo_path` so the app reads the actual key directly.
 */
function safeKeyFor(stem) {
  // ASCII + dash/underscore/dot only → safe as-is
  if (/^[a-zA-Z0-9._-]+$/.test(stem)) return stem;
  const h = crypto.createHash("sha1").update(stem).digest("hex").slice(0, 16);
  return `m-${h}`;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Run with `node --env-file=.env.local scripts/migrate-to-supabase.mjs`.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const dbPath = path.join(process.cwd(), "data", "cheezefilm.db");
const db = new Database(dbPath, { readonly: true });

// ────────────────────────────────────────────────────────────
// 1) Tables — pull from sqlite, push to Postgres.
// ────────────────────────────────────────────────────────────
async function migrateTable(name, transform = (r) => r, options = {}) {
  const rows = db.prepare(`SELECT * FROM ${name}`).all();
  console.log(`[${name}] ${rows.length} rows`);
  if (rows.length === 0) return;
  const mapped = rows.map(transform);
  // Postgres upserts by primary key. `onConflict` accepts the conflict
  // column name; fall back to "id" for serial PKs.
  const { error } = await supabase
    .from(name)
    .upsert(mapped, { onConflict: options.onConflict ?? "id" });
  if (error) {
    console.error(`  ✗ ${name}:`, error.message);
    return;
  }
  console.log(`  ✓ ${name}: ${mapped.length} upserted`);
}

// `works` was stored as JSON text in sqlite; Postgres column is jsonb.
const parseWorks = (s) => {
  try {
    return JSON.parse(s ?? "[]");
  } catch {
    return [];
  }
};

await migrateTable(
  "members",
  (r) => ({
    slug: r.slug,
    name: r.name,
    name_en: r.name_en,
    role: r.role,
    role_label: r.role_label,
    highlight: r.highlight,
    bio: r.bio,
    works: parseWorks(r.works),
    joined_note: r.joined_note,
    instagram: r.instagram,
    source_url: r.source_url,
    accent: r.accent,
    uncertain: r.uncertain === 1,
    sort_order: r.sort_order,
    created_at: r.created_at,
  }),
  { onConflict: "slug" },
);

await migrateTable("audition_listings", (r) => ({
  id: r.id,
  title: r.title,
  description: r.description,
  role_type: r.role_type,
  requirements: r.requirements,
  deadline: r.deadline,
  status: r.status,
  created_at: r.created_at,
  updated_at: r.updated_at,
}));

await migrateTable("auditions", (r) => ({
  id: r.id,
  name: r.name,
  age: r.age,
  gender: r.gender,
  phone: r.phone,
  email: r.email,
  experience: r.experience,
  role_preference: r.role_preference,
  intro: r.intro,
  portfolio_url: r.portfolio_url,
  photo_url: r.photo_url,
  status: r.status,
  listing_id: r.listing_id,
  birthdate: r.birthdate,
  created_at: r.created_at,
}));

await migrateTable("fan_messages", (r) => ({
  id: r.id,
  nickname: r.nickname,
  email: r.email,
  favorite_work: r.favorite_work,
  message: r.message,
  is_read: r.is_read === 1,
  created_at: r.created_at,
}));

await migrateTable(
  "site_content",
  (r) => ({
    key: r.key,
    value: r.value,
    updated_at: r.updated_at,
  }),
  { onConflict: "key" },
);

// Reset sequences so future INSERTs don't collide with migrated ids.
// (Postgres serial sequences don't know we just inserted high ids.)
console.log("\nResetting sequences…");
const { error: seqErr } = await supabase.rpc("_noop_just_to_check", {}).then(
  () => ({ error: null }),
  () => ({ error: null }),
);
// `rpc` is just a probe — we actually run SQL via the REST `sql` endpoint
// which the JS client doesn't expose. Sequence resets are handled below
// via raw fetch to /pg-meta but that requires the management API key.
// Easier: skip here, run manually via psql after this script.
console.log(
  "  ⚠ run this after the script (via psql):\n" +
    `  select setval('auditions_id_seq', (select coalesce(max(id), 1) from auditions));\n` +
    `  select setval('audition_listings_id_seq', (select coalesce(max(id), 1) from audition_listings));\n` +
    `  select setval('fan_messages_id_seq', (select coalesce(max(id), 1) from fan_messages));`,
);

// ────────────────────────────────────────────────────────────
// 2) Storage — push local files to matching buckets.
// ────────────────────────────────────────────────────────────
async function uploadBucket(bucket, localDir) {
  let names;
  try {
    names = fs.readdirSync(localDir);
  } catch {
    console.log(`[storage:${bucket}] (no directory) — skip`);
    return;
  }
  const files = names.filter(
    (n) => !n.startsWith(".") && !n.startsWith("_") && !n.endsWith(".md"),
  );
  console.log(`[storage:${bucket}] ${files.length} files`);
  let ok = 0;
  let fail = 0;
  // Returns a map of `stem` → `key` so the caller can write photo_path
  // back to the DB for the members bucket.
  const stemToKey = new Map();
  for (const name of files) {
    const ext = path.extname(name);
    const stem = path.basename(name, ext);
    const key = `${safeKeyFor(stem)}${ext}`;
    stemToKey.set(stem, key);
    const buffer = fs.readFileSync(path.join(localDir, name));
    const { error } = await supabase.storage
      .from(bucket)
      .upload(key, buffer, {
        upsert: true,
        contentType: guessContentType(name),
      });
    if (error) {
      console.error(`  ✗ ${name} → ${key}: ${error.message}`);
      fail++;
    } else {
      ok++;
    }
  }
  console.log(`  ✓ ${ok} uploaded${fail ? `, ${fail} failed` : ""}`);
  return stemToKey;
}

function guessContentType(name) {
  const ext = path.extname(name).toLowerCase();
  return (
    {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
    }[ext] ?? "application/octet-stream"
  );
}

const membersKeyMap = await uploadBucket(
  "members",
  path.join(process.cwd(), "public", "members"),
);
await uploadBucket("covers", path.join(process.cwd(), "public", "covers"));
await uploadBucket("reels", path.join(process.cwd(), "public", "reels"));

// Write photo_path back to the matching members row.
console.log("\n[members.photo_path] linking files to rows…");
let updated = 0;
let missing = 0;
const memberRows = db.prepare("SELECT slug FROM members").all();
for (const { slug } of memberRows) {
  const key = membersKeyMap.get(slug);
  if (!key) {
    missing++;
    continue;
  }
  const { error } = await supabase
    .from("members")
    .update({ photo_path: key })
    .eq("slug", slug);
  if (error) {
    console.error(`  ✗ ${slug}: ${error.message}`);
  } else {
    updated++;
  }
}
console.log(`  ✓ ${updated} updated, ${missing} members without a photo file`);

db.close();
console.log("\n✓ migration complete");
