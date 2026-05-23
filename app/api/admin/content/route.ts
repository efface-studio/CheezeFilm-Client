import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { setContent, resetContent, CONTENT_REGISTRY } from "@/lib/content";
import { bumpContent } from "@/lib/revalidate";

export const runtime = "nodejs";

const VALID_KEYS = new Set(CONTENT_REGISTRY.map((e) => e.key));

type Body = { key?: string; value?: string; reset?: boolean };

export async function PUT(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const key = (body.key ?? "").trim();
  if (!key || !VALID_KEYS.has(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  if (body.reset) {
    await resetContent(key);
    bumpContent();
    return NextResponse.json({ ok: true, action: "reset" });
  }

  const value = body.value ?? "";
  if (typeof value !== "string") {
    return NextResponse.json({ error: "value must be a string" }, { status: 400 });
  }
  if (value.length > 5000) {
    return NextResponse.json(
      { error: "5000자 이하로 작성해주세요." },
      { status: 400 },
    );
  }
  await setContent(key, value);
  bumpContent();
  return NextResponse.json({ ok: true, action: "set" });
}
