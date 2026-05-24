import { NextResponse } from "next/server";
import { serverClient } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { auditLog } from "@/lib/auditLog";

export const runtime = "nodejs";

const ALLOWED_STATUS = new Set([
  "pending",
  "reviewing",
  "accepted",
  "rejected",
]);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = body.status?.trim();
  if (!status || !ALLOWED_STATUS.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const sb = serverClient();
  const { error, count } = await sb
    .from("auditions")
    .update({ status }, { count: "exact" })
    .eq("id", numericId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if ((count ?? 0) === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  auditLog({
    action: "update",
    resource: "audition",
    id: numericId,
    username: session.username,
    meta: { status },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sb = serverClient();
  const { error, count } = await sb
    .from("auditions")
    .delete({ count: "exact" })
    .eq("id", numericId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if ((count ?? 0) === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  auditLog({
    action: "delete",
    resource: "audition",
    id: numericId,
    username: session.username,
  });
  return NextResponse.json({ ok: true });
}
