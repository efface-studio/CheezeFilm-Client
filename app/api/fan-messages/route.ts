import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Spam guard: 10 fan messages per hour per IP.
const FAN_LIMIT = 10;
const FAN_WINDOW = 60 * 60_000;

type Body = {
  nickname?: string;
  email?: string | null;
  favorite_work?: string | null;
  message?: string;
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`fan:${ip}`, FAN_LIMIT, FAN_WINDOW);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `잠시 후 다시 시도해주세요. (${rl.retryAfter}초)` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const nickname = (body.nickname ?? "").trim();
  const message = (body.message ?? "").trim();
  const email = (body.email ?? "")?.toString().trim() || null;

  if (!nickname || nickname.length > 30) {
    return NextResponse.json(
      { error: "닉네임을 1~30자로 입력해주세요." },
      { status: 400 },
    );
  }
  if (!message || message.length < 2) {
    return NextResponse.json(
      { error: "메시지를 입력해주세요." },
      { status: 400 },
    );
  }
  if (message.length > 2000) {
    return NextResponse.json(
      { error: "메시지는 2000자 이하로 작성해주세요." },
      { status: 400 },
    );
  }
  if (email && !isEmail(email)) {
    return NextResponse.json(
      { error: "이메일 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const stmt = db.prepare(`
    INSERT INTO fan_messages (nickname, email, favorite_work, message)
    VALUES (@nickname, @email, @favorite_work, @message)
  `);

  const result = stmt.run({
    nickname,
    email,
    favorite_work: body.favorite_work ?? null,
    message,
  });

  return NextResponse.json(
    { ok: true, id: result.lastInsertRowid },
    { status: 201 },
  );
}
