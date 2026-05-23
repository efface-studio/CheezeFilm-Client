/**
 * Audition listings — the "job board" layer that sits in front of the
 * audition submission form. Admins post calls; the public picks one;
 * submissions are tied to the chosen listing.
 *
 * Supabase-backed. All accessors are async.
 */

import { serverClient, type AuditionListing } from "./db";
import { parseDeadline, formatDeadline } from "./deadline";

export { parseDeadline, formatDeadline };

export const ROLE_TYPES = ["lead", "support", "extra", "staff"] as const;
export const STATUSES = ["draft", "open", "closed"] as const;

export const ROLE_TYPE_LABEL: Record<AuditionListing["role_type"], string> = {
  lead: "주연",
  support: "조연",
  extra: "단역",
  staff: "스태프",
};

export const STATUS_LABEL: Record<AuditionListing["status"], string> = {
  draft: "초안",
  open: "모집중",
  closed: "마감",
};

function isOpenForApplications(l: AuditionListing): boolean {
  if (l.status !== "open") return false;
  const t = parseDeadline(l.deadline);
  if (t !== null && t < Date.now()) return false;
  return true;
}

const COLS =
  "id,title,description,role_type,requirements,deadline,status,created_at,updated_at";

/** All listings, admin-side. */
export async function getAllListings(): Promise<AuditionListing[]> {
  const sb = serverClient();
  const { data, error } = await sb
    .from("audition_listings")
    .select(COLS)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listings.getAllListings]", error);
    return [];
  }
  return data as AuditionListing[];
}

/** Public-facing list — only ones admins have marked open AND not past deadline. */
export async function getOpenListings(): Promise<AuditionListing[]> {
  const sb = serverClient();
  const { data, error } = await sb
    .from("audition_listings")
    .select(COLS)
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[listings.getOpenListings]", error);
    return [];
  }
  return (data as AuditionListing[]).filter(isOpenForApplications);
}

export async function findListing(
  id: number,
): Promise<AuditionListing | undefined> {
  const sb = serverClient();
  const { data, error } = await sb
    .from("audition_listings")
    .select(COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[listings.findListing]", error);
    return undefined;
  }
  return (data as AuditionListing | null) ?? undefined;
}

export async function isAcceptingApplications(id: number): Promise<boolean> {
  const l = await findListing(id);
  return l ? isOpenForApplications(l) : false;
}

type CreateInput = Omit<AuditionListing, "id" | "created_at" | "updated_at">;

export async function createListing(input: CreateInput): Promise<number> {
  const sb = serverClient();
  const { data, error } = await sb
    .from("audition_listings")
    .insert({
      title: input.title,
      description: input.description ?? "",
      role_type: input.role_type,
      requirements: input.requirements ?? "",
      deadline: input.deadline ?? null,
      status: input.status,
    })
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: number }).id;
}

export async function updateListing(
  id: number,
  patch: Partial<CreateInput>,
): Promise<boolean> {
  const sb = serverClient();
  const update: Record<string, unknown> = {};
  for (const k of [
    "title",
    "description",
    "role_type",
    "requirements",
    "deadline",
    "status",
  ] as const) {
    if (k in patch) update[k] = (patch as Record<string, unknown>)[k];
  }
  if (Object.keys(update).length === 0) return false;
  const { error, count } = await sb
    .from("audition_listings")
    .update(update, { count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function deleteListing(id: number): Promise<boolean> {
  const sb = serverClient();
  const { error, count } = await sb
    .from("audition_listings")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** A small helper for the admin audition detail view. */
export async function listingSummary(
  id: number | null,
): Promise<string | null> {
  if (id === null) return null;
  const l = await findListing(id);
  return l ? `#${l.id} · ${l.title}` : null;
}
