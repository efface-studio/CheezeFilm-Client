/**
 * Server-only i18n helpers. Lives in its own file so the rest of
 * `lib/i18n.ts` (types + dictionaries + translation lookups) can be
 * imported from client components without dragging `next/headers` into
 * the client bundle.
 */
import "server-only";
import { cookies } from "next/headers";
import { COOKIE_NAME, type Lang } from "./i18n";

/** Read the current lang from the `cf_lang` cookie. Defaults to "ko". */
export async function getServerLang(): Promise<Lang> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  return raw === "en" ? "en" : "ko";
}
