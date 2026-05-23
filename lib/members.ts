/**
 * 치즈필름 멤버 데이터 — Supabase Postgres-backed.
 *
 * Photos:
 *   - Each row may carry a `photoPath` (Storage key in the `members`
 *     bucket). The migration script populated it from the local files.
 *   - Reads go via `storageUrl("members", member.photoPath)`. No
 *     filesystem touches in the deployed app.
 *
 * Async migration note:
 *   - All getters now return Promises since we're hitting Postgres.
 *   - The old synchronous `members` Proxy is gone — callers do
 *     `await getMembers()` instead.
 */

import { unstable_cache } from "next/cache";
import { serverClient } from "./db";

/**
 * Cache tags + revalidate windows for cross-request caching. The admin
 * write endpoints call `revalidateTag("members")` after mutations so
 * edits flush immediately; otherwise public reads share the cached
 * result for `MEMBERS_TTL` seconds and don't hit Supabase per request.
 */
export const MEMBERS_TAG = "members";
const MEMBERS_TTL = 300; // 5 min

export type MemberRole = "lead" | "actor" | "writer" | "director";

export type Member = {
  slug: string;
  name: string;
  nameEn: string;
  role: MemberRole;
  roleLabel: string;
  highlight: string;
  bio: string;
  works: string[];
  joinedNote?: string;
  instagram?: string;
  sourceUrl?: string;
  accent: "purple" | "yellow" | "wine" | "charcoal" | "olive" | "cream";
  uncertain?: boolean;
  /** Storage key inside the `members` bucket (e.g. `choi-eunji.jpg` or
   *  `m-22895c0145bcf127.jpg` for Korean-slug entries). Undefined when no
   *  photo is uploaded. */
  photoPath?: string;
};

type Row = {
  slug: string;
  name: string;
  name_en: string;
  role: MemberRole;
  role_label: string;
  highlight: string;
  bio: string;
  works: string[] | string | null; // jsonb but the SDK may return as array
  joined_note: string | null;
  instagram: string | null;
  source_url: string | null;
  accent: Member["accent"];
  uncertain: boolean;
  sort_order: number;
  photo_path: string | null;
};

function rowToMember(r: Row): Member {
  return {
    slug: r.slug,
    name: r.name,
    nameEn: r.name_en,
    role: r.role,
    roleLabel: r.role_label,
    highlight: r.highlight,
    bio: r.bio,
    works: normalizeWorks(r.works),
    joinedNote: r.joined_note ?? undefined,
    instagram: r.instagram ?? undefined,
    sourceUrl: r.source_url ?? undefined,
    accent: r.accent,
    uncertain: r.uncertain ? true : undefined,
    photoPath: r.photo_path ?? undefined,
  };
}

function normalizeWorks(w: Row["works"]): string[] {
  if (Array.isArray(w)) return w.filter((x) => typeof x === "string");
  if (typeof w === "string") {
    try {
      const parsed = JSON.parse(w);
      return Array.isArray(parsed)
        ? parsed.filter((x) => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ─── public API ─────────────────────────────────────────────

export const getMembers = unstable_cache(
  async (): Promise<Member[]> => {
    const sb = serverClient();
    const { data, error } = await sb
      .from("members")
      .select(
        "slug,name,name_en,role,role_label,highlight,bio,works,joined_note,instagram,source_url,accent,uncertain,sort_order,photo_path",
      )
      .order("sort_order", { ascending: true })
      .order("slug", { ascending: true });
    if (error) {
      console.error("[members.getMembers]", error);
      return [];
    }
    return (data as Row[]).map(rowToMember);
  },
  ["members:all"],
  { tags: [MEMBERS_TAG], revalidate: MEMBERS_TTL },
);

export const findMember = unstable_cache(
  async (slug: string): Promise<Member | undefined> => {
    const sb = serverClient();
    const { data, error } = await sb
      .from("members")
      .select(
        "slug,name,name_en,role,role_label,highlight,bio,works,joined_note,instagram,source_url,accent,uncertain,sort_order,photo_path",
      )
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.error("[members.findMember]", error);
      return undefined;
    }
    return data ? rowToMember(data as Row) : undefined;
  },
  ["members:byslug"],
  { tags: [MEMBERS_TAG], revalidate: MEMBERS_TTL },
);

// ─── mutations (admin only — call sites must enforce auth) ──

export async function createMember(input: Member): Promise<void> {
  const sb = serverClient();
  const { data: maxRow } = await sb
    .from("members")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow?.sort_order as number | undefined) ?? -1) + 1;
  const { error } = await sb.from("members").insert({
    slug: input.slug,
    name: input.name,
    name_en: input.nameEn,
    role: input.role,
    role_label: input.roleLabel,
    highlight: input.highlight,
    bio: input.bio,
    works: input.works,
    joined_note: input.joinedNote ?? null,
    instagram: input.instagram ?? null,
    source_url: input.sourceUrl ?? null,
    accent: input.accent,
    uncertain: !!input.uncertain,
    sort_order: nextOrder,
    photo_path: input.photoPath ?? null,
  });
  if (error) throw error;
}

export async function updateMember(
  slug: string,
  patch: Partial<Omit<Member, "slug">>,
): Promise<void> {
  const sb = serverClient();
  const update: Record<string, unknown> = {};
  if ("name" in patch) update.name = patch.name;
  if ("nameEn" in patch) update.name_en = patch.nameEn;
  if ("role" in patch) update.role = patch.role;
  if ("roleLabel" in patch) update.role_label = patch.roleLabel;
  if ("highlight" in patch) update.highlight = patch.highlight;
  if ("bio" in patch) update.bio = patch.bio;
  if ("works" in patch) update.works = patch.works ?? [];
  if ("joinedNote" in patch) update.joined_note = patch.joinedNote ?? null;
  if ("instagram" in patch) update.instagram = patch.instagram ?? null;
  if ("sourceUrl" in patch) update.source_url = patch.sourceUrl ?? null;
  if ("accent" in patch) update.accent = patch.accent;
  if ("uncertain" in patch) update.uncertain = !!patch.uncertain;
  if ("photoPath" in patch) update.photo_path = patch.photoPath ?? null;
  if (Object.keys(update).length === 0) return;
  const { error } = await sb.from("members").update(update).eq("slug", slug);
  if (error) throw error;
}

export async function deleteMember(slug: string): Promise<void> {
  const sb = serverClient();
  const { error } = await sb.from("members").delete().eq("slug", slug);
  if (error) throw error;
}

export function getRoleColorClass(accent: Member["accent"]) {
  switch (accent) {
    case "purple":
      return "bg-cheeze-purple text-cheeze-yellow";
    case "yellow":
      return "bg-cheeze-yellow text-cheeze-purple-deep";
    case "wine":
      return "bg-cheeze-wine text-cheeze-cream";
    case "charcoal":
      return "bg-cheeze-charcoal text-cheeze-yellow";
    case "olive":
      return "bg-cheeze-olive text-cheeze-cream";
    case "cream":
      return "bg-cheeze-cream-deep text-cheeze-purple-deep";
  }
}
