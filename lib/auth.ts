import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "cheeze_admin_session";
const SESSION_DURATION = 60 * 60 * 8; // 8 hours

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is not defined");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Constant-time string comparison. Naïve `===` short-circuits at the
 * first differing byte, leaking secret length / prefix through CPU-time
 * differences. Pad both buffers to the same length before comparing so
 * `timingSafeEqual` (which requires equal-length inputs) can be used
 * regardless of attacker-supplied length.
 */
function safeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  // Compare against a zero-padded copy so an early length-mismatch
  // shortcut doesn't leak the secret's true length. We still return
  // `false` for mismatched lengths after the constant-time pass.
  const len = Math.max(aBuf.length, bBuf.length);
  const aPad = Buffer.alloc(len);
  const bPad = Buffer.alloc(len);
  aBuf.copy(aPad);
  bBuf.copy(bPad);
  const equal = timingSafeEqual(aPad, bPad);
  return equal && aBuf.length === bBuf.length;
}

export async function createSession(username: string) {
  const token = await new SignJWT({ sub: username, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<{ username: string } | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub === "string") {
      return { username: payload.sub };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Constant-time credential check. Both checks run regardless of whether
 * the username matched so attackers can't distinguish "no such user"
 * from "wrong password" through response time. `verifyCredentials` is
 * also why `safeEquals` zero-pads — without it, the username check would
 * leak the configured admin-name length.
 */
export function verifyCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const expectedPass = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  const userOk = safeEquals(username, expectedUser);
  const passOk = safeEquals(password, expectedPass);
  return userOk && passOk;
}
