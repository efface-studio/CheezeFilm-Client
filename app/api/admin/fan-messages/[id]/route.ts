import { NextResponse } from "next/server";
import { serverClient } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

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

  const body = (await req.json().catch(() => ({}))) as { is_read?: boolean };
  const is_read = !!body.is_read;

  const sb = serverClient();
  const { error, count } = await sb
    .from("fan_messages")
    .update({ is_read }, { count: "exact" })
    .eq("id", numericId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if ((count ?? 0) === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
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
    .from("fan_messages")
    .delete({ count: "exact" })
    .eq("id", numericId);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if ((count ?? 0) === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
