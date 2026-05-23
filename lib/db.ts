/**
 * Server-side Supabase clients + DB row types.
 *
 * The app uses two clients depending on the call site:
 *   - `serverClient()` (service-role): full access, bypasses RLS.
 *     Used by every server-side query/mutation in `lib/*` and `/api/*`.
 *     NEVER expose this key to the browser.
 *   - `publicClient()` (anon/publishable): for any future browser-side
 *     reads with RLS-enforced policies. Currently unused since reads go
 *     through Server Components, but we expose it so the wiring is ready.
 *
 * Both clients are cached at module scope so successive imports during
 * a single Next.js worker's lifetime reuse the same HTTP keep-alive.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _server: SupabaseClient | null = null;
let _public: SupabaseClient | null = null;

export function serverClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error(
      "Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  if (!_server) {
    _server = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        // Tell Postgres "this server is short-lived" so requests don't hold
        // a connection forever — important on serverless.
        headers: { "x-client-info": "cheezefilm-server" },
      },
    });
  }
  return _server;
}

export function publicClient(): SupabaseClient {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error(
      "Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  if (!_public) {
    _public = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _public;
}

/**
 * Public Storage URL for a key in a bucket.
 * Buckets `members`/`covers`/`reels` are public, so the URL is direct
 * (no signed URL needed). For `auditions` (private), use
 * `serverClient().storage.from('auditions').createSignedUrl(...)`.
 */
export function storageUrl(bucket: string, key: string): string {
  // Keys are already ASCII-safe (see scripts/migrate-to-supabase.mjs).
  // No further encoding needed.
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${key}`;
}

// ────────────────────────────────────────────────────────────
// Row types — mirror the Postgres schema.
// ────────────────────────────────────────────────────────────

export type Audition = {
  id: number;
  name: string;
  age: number | null;
  /** ISO date `YYYY-MM-DD` — newer submissions carry this; older rows
   *  may only have `age`. */
  birthdate: string | null;
  gender: string | null;
  phone: string | null;
  email: string;
  experience: string | null;
  role_preference: string | null;
  intro: string;
  portfolio_url: string | null;
  photo_url: string | null;
  listing_id: number | null;
  status: "pending" | "reviewing" | "accepted" | "rejected";
  created_at: string;
};

export type AuditionListing = {
  id: number;
  title: string;
  description: string;
  role_type: "lead" | "support" | "extra" | "staff";
  requirements: string;
  deadline: string | null;
  status: "draft" | "open" | "closed";
  created_at: string;
  updated_at: string;
};

export type FanMessage = {
  id: number;
  nickname: string;
  email: string | null;
  favorite_work: string | null;
  message: string;
  /** Postgres stores bool; we keep `number` shape (0|1) so the existing
   *  admin UI's strict equality checks (`m.is_read === 1`) don't break. */
  is_read: number;
  created_at: string;
};
