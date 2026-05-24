import { unstable_cache } from "next/cache";
import { hasSupabaseServerEnv, serverClient, storageUrl } from "./db";

/**
 * Returns the public URLs of every landscape cover photo in the
 * Supabase `covers` Storage bucket. The home hero uses them as a
 * cross-fade slideshow, falling back to YouTube video thumbnails when
 * this list is empty.
 *
 * Sort order = filename (so the admin can prefix `01-`, `02-` to
 * control it). Files starting with `_` or `.` are skipped — handy
 * for hiding WIP shots without deleting them.
 *
 * Wrapped in `unstable_cache` so the Storage list call is shared across
 * requests. Admin cover uploads/deletes call
 * `revalidateTag(COVERS_TAG)` to flush this list immediately.
 */
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

export const COVERS_TAG = "covers";
const COVERS_TTL = 300; // 5 min

export const getCoverPhotos = unstable_cache(
  async (): Promise<string[]> => {
    if (!hasSupabaseServerEnv()) return [];
    const sb = serverClient();
    const { data, error } = await sb.storage.from("covers").list("", {
      limit: 100,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) {
      console.error("[coverPhotos]", error);
      return [];
    }
    return (data ?? [])
      .filter((f) => {
        const name = f.name;
        if (!name) return false;
        if (name.startsWith("_") || name.startsWith(".")) return false;
        return ALLOWED_EXTS.some((ext) => name.toLowerCase().endsWith(ext));
      })
      .map((f) => storageUrl("covers", f.name));
  },
  ["covers:list"],
  { tags: [COVERS_TAG], revalidate: COVERS_TTL },
);
