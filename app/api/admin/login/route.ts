import { NextResponse } from "next/server";
import { createSession, verifyCredentials } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { auditLog } from "@/lib/auditLog";

export const runtime = "nodejs";

// Brute-force protection: 8 attempts per 15 minutes per IP. Failed AND
// successful attempts both count so a determined attacker can't just spray.
const LOGIN_LIMIT = 8;
const LOGIN_WINDOW = 15 * 60_000;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: `로그인 시도가 너무 많습니다. ${rl.retryAfter}초 뒤 다시 시도해주세요.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Reset": String(rl.resetAt),
        },
      },
    );
  }

  const body = (await req
    .json()
    .catch(() => ({}))) as { username?: string; password?: string };

  const username = (body.username ?? "").trim();
  const password = (body.password ?? "").trim();

  if (!username || !password) {
    return NextResponse.json(
      { error: "아이디와 비밀번호를 입력해주세요." },
      { status: 400 },
    );
  }

  if (!verifyCredentials(username, password)) {
    // Log failed attempts too — the rate-limit catches brute force,
    // but the audit trail lets us spot credential-stuffing waves and
    // correlate IPs across multiple usernames.
    auditLog({
      action: "login",
      resource: "session",
      id: username,
      username,
      meta: { ok: false, ip },
    });
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  await createSession(username);
  auditLog({
    action: "login",
    resource: "session",
    id: username,
    username,
    meta: { ok: true, ip },
  });
  return NextResponse.json({ ok: true });
}
