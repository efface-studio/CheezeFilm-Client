import fs from "node:fs";
import path from "node:path";

/**
 * Returns the public URLs of every landscape cover photo dropped into
 * `/public/covers/`. The V2 home hero uses them as a cross-fade slideshow,
 * falling back to YouTube video thumbnails when this list is empty.
 *
 * Sort order = filename (so users can prefix `01-`, `02-` to control it).
 * Files starting with `_` or `.` are skipped — handy for hiding WIP shots
 * without deleting them.
 */
const ALLOWED_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export function getCoverPhotos(): string[] {
  const dir = path.join(process.cwd(), "public", "covers");
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    // Folder may not exist yet (fresh checkout) — treat as "no covers".
    return [];
  }
  return entries
    .filter((name) => {
      if (name.startsWith("_") || name.startsWith(".")) return false;
      return ALLOWED_EXTS.has(path.extname(name).toLowerCase());
    })
    .sort((a, b) => a.localeCompare(b, "en"))
    .map((name) => `/covers/${name}`);
}
