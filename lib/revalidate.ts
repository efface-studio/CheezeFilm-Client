/**
 * Cache-invalidation helpers — call from admin write endpoints after a
 * successful mutation. Two layers fire:
 *
 *   1. `revalidateTag(tag, "max")` on the data-layer tag — marks the
 *      `unstable_cache`-wrapped Supabase fetch (e.g. `getMembers`) as
 *      stale so the next visitor triggers a background refresh. (Next 16
 *      requires the second `profile` argument; "max" gives us
 *      stale-while-revalidate semantics, which is what we want.)
 *
 *   2. `revalidatePath()` on each route that renders that data — flushes
 *      the segment-level ISR HTML cache. Without this, even though the
 *      data fetch returns fresh rows, the CDN keeps serving the old
 *      rendered HTML until the route's own `revalidate` window expires.
 *
 * Paths listed here mirror where each kind of data appears on the
 * public site. Add new pages here as you wire them up.
 */
import { revalidatePath, revalidateTag } from "next/cache";

import { MEMBERS_TAG } from "./members";
import { CONTENT_TAG } from "./content";
import { LISTINGS_TAG } from "./auditionListings";
import { COVERS_TAG } from "./coverPhotos";
import { VIDEOS_TAG } from "./youtube";

const PROFILE = "max" as const;

export function bumpMembers() {
  revalidateTag(MEMBERS_TAG, PROFILE);
  revalidatePath("/");
  revalidatePath("/members");
  revalidatePath("/members/[slug]", "page");
}

export function bumpContent() {
  revalidateTag(CONTENT_TAG, PROFILE);
  revalidatePath("/");
  revalidatePath("/careers");
  revalidatePath("/support");
}

export function bumpListings() {
  revalidateTag(LISTINGS_TAG, PROFILE);
  revalidatePath("/support");
}

export function bumpCovers() {
  revalidateTag(COVERS_TAG, PROFILE);
  revalidatePath("/");
}

/**
 * Flush the YouTube videos cache. Not wired into any admin write today
 * (we don't have an "edit a video" action) but exposed so a future
 * "refresh from YouTube" button — or a manual cron — can force a
 * re-pull without waiting on the 10-min revalidate window.
 */
export function bumpVideos() {
  revalidateTag(VIDEOS_TAG, PROFILE);
  revalidatePath("/");
  revalidatePath("/videos");
}
