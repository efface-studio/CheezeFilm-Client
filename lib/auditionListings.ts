/**
 * Audition listings — the "job board" layer that sits in front of the
 * audition submission form. Admins post calls; the public picks one;
 * submissions are tied to the chosen listing.
 */

import { db, type AuditionListing } from "./db";

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
  if (l.deadline) {
    const d = new Date(l.deadline);
    if (!Number.isNaN(d.getTime()) && d.getTime() < Date.now()) return false;
  }
  return true;
}

/** All listings, admin-side. */
export function getAllListings(): AuditionListing[] {
  return db
    .prepare("SELECT * FROM audition_listings ORDER BY created_at DESC")
    .all() as AuditionListing[];
}

/** Public-facing list — only ones admins have marked open AND not past deadline. */
export function getOpenListings(): AuditionListing[] {
  const rows = db
    .prepare(
      "SELECT * FROM audition_listings WHERE status = 'open' ORDER BY created_at DESC",
    )
    .all() as AuditionListing[];
  return rows.filter(isOpenForApplications);
}

export function findListing(id: number): AuditionListing | undefined {
  return db
    .prepare("SELECT * FROM audition_listings WHERE id = ?")
    .get(id) as AuditionListing | undefined;
}

export function isAcceptingApplications(id: number): boolean {
  const l = findListing(id);
  return l ? isOpenForApplications(l) : false;
}

type CreateInput = Omit<AuditionListing, "id" | "created_at" | "updated_at">;

export function createListing(input: CreateInput): number {
  const res = db
    .prepare(
      `INSERT INTO audition_listings
        (title, description, role_type, requirements, deadline, status)
       VALUES (@title, @description, @role_type, @requirements, @deadline, @status)`,
    )
    .run({
      title: input.title,
      description: input.description ?? "",
      role_type: input.role_type,
      requirements: input.requirements ?? "",
      deadline: input.deadline ?? null,
      status: input.status,
    });
  return Number(res.lastInsertRowid);
}

export function updateListing(
  id: number,
  patch: Partial<CreateInput>,
): boolean {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  const map: Record<string, string> = {
    title: "title",
    description: "description",
    role_type: "role_type",
    requirements: "requirements",
    deadline: "deadline",
    status: "status",
  };
  for (const [k, v] of Object.entries(patch)) {
    const col = map[k];
    if (!col) continue;
    fields.push(`${col} = @${col}`);
    params[col] = v;
  }
  if (fields.length === 0) return false;
  fields.push("updated_at = datetime('now')");
  const res = db
    .prepare(`UPDATE audition_listings SET ${fields.join(", ")} WHERE id = @id`)
    .run(params);
  return res.changes > 0;
}

export function deleteListing(id: number): boolean {
  const res = db
    .prepare("DELETE FROM audition_listings WHERE id = ?")
    .run(id);
  return res.changes > 0;
}

/** A small helper for the admin audition detail view. */
export function listingSummary(id: number | null): string | null {
  if (id === null) return null;
  const l = findListing(id);
  return l ? `#${l.id} · ${l.title}` : null;
}
