import { NextResponse } from "next/server";
import { db, type Audition, type FanMessage } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * CSV export of auditions or fan messages.
 *   GET /api/admin/export?type=auditions   → auditions.csv
 *   GET /api/admin/export?type=fan         → fan-messages.csv
 *
 * Requires an admin session. Properly escapes quotes, commas, newlines.
 */

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Record<string, unknown>[], headers: string[]): string {
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }
  // UTF-8 BOM so Excel opens Korean text correctly
  return "﻿" + lines.join("\r\n");
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const today = new Date().toISOString().slice(0, 10);

  if (type === "auditions") {
    const rows = db
      .prepare("SELECT * FROM auditions ORDER BY created_at DESC")
      .all() as Audition[];
    const csv = toCsv(rows as unknown as Record<string, unknown>[], [
      "id",
      "name",
      "age",
      "gender",
      "phone",
      "email",
      "role_preference",
      "experience",
      "intro",
      "portfolio_url",
      "photo_url",
      "status",
      "created_at",
    ]);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="auditions-${today}.csv"`,
      },
    });
  }

  if (type === "fan") {
    const rows = db
      .prepare("SELECT * FROM fan_messages ORDER BY created_at DESC")
      .all() as FanMessage[];
    const csv = toCsv(rows as unknown as Record<string, unknown>[], [
      "id",
      "nickname",
      "email",
      "favorite_work",
      "message",
      "is_read",
      "created_at",
    ]);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fan-messages-${today}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
