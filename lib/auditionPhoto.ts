import { serverClient } from "./db";

/**
 * Resolve an audition photo's display URL.
 *
 * The `auditions` Supabase Storage bucket is **private** so applicant
 * photos aren't world-readable. Admin views read them via short-lived
 * signed URLs minted with the service-role client.
 *
 * Two shapes have ever been stored in `photo_url`:
 *   - legacy entries: full `https://…` URL (some were uploaded to the
 *     public bucket before the security pass) → return as-is.
 *   - current entries: bucket-relative key like
 *     "1716567000-abc12345.jpg" → mint a signed URL for it.
 *
 * Returns `null` when nothing is stored OR when the signed URL mint
 * fails — admin pages render a "사진 없음" placeholder either way.
 */
export async function resolveAuditionPhoto(
  stored: string | null | undefined,
): Promise<string | null> {
  if (!stored) return null;
  if (stored.startsWith("http://") || stored.startsWith("https://")) {
    return stored;
  }
  try {
    const sb = serverClient();
    // 1-hour TTL is plenty for admin browsing — the dossier panel
    // doesn't stay open that long and revisiting fires a fresh server
    // render anyway.
    const { data, error } = await sb.storage
      .from("auditions")
      .createSignedUrl(stored, 3600);
    if (error || !data?.signedUrl) {
      console.warn("[audition-photo] signed URL failed for", stored, error?.message);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.warn("[audition-photo] signed URL threw for", stored, err);
    return null;
  }
}

/**
 * Batch-resolve every audition's photo URL in parallel.
 *
 * The admin auditions table renders ~50–200 rows at a time, each with
 * a `<details>` expansion. Previously every expansion fired its own
 * `createSignedUrl` round-trip *while the user was viewing the row* —
 * the dossier panel would pause for ~200ms on every open.
 *
 * Doing it once at the page level instead pre-pays the cost during
 * the initial server render (parallel, ~1 round-trip total) and lets
 * the rest of the table stay 100% sync afterwards.
 *
 * Supabase Storage doesn't expose a bulk-sign endpoint — under the
 * hood this is N parallel HTTP requests. The service-role client can
 * comfortably saturate this without rate-limiting itself.
 *
 * Returns a `Map<id, signedUrl | null>` keyed by audition id.
 */
export async function batchResolveAuditionPhotos(
  items: Array<{ id: number; photo_url: string | null | undefined }>,
): Promise<Map<number, string | null>> {
  const entries = await Promise.all(
    items.map(async (a) => {
      const url = await resolveAuditionPhoto(a.photo_url);
      return [a.id, url] as const;
    }),
  );
  return new Map(entries);
}
