import { cache } from "react";
import { serverClient, storageUrl } from "./db";

/**
 * Returns the public URLs of every landscape cover photo in the
 * Supabase `covers` Storage bucket. The V2 home hero uses them as a
 * cross-fade slideshow, falling back to YouTube video thumbnails when
 * this list is empty.
 *
 * Sort order = filename (so the admin can prefix `01-`, `02-` to
 * control it). Files starting with `_` or `.` are skipped — handy
 * for hiding WIP shots without deleting them.
 *
 * Wrapped in `cache()` so multiple components on the same request share
 * one Storage list call.
 */
const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

export const getCoverPhotos = cache(async (): Promise<string[]> => {
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
});
