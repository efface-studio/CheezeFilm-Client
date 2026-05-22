import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isAcceptingApplications } from "@/lib/auditionListings";

export const runtime = "nodejs";

// Spam guard: at most 5 audition submissions per hour per IP.
const AUDITION_LIMIT = 5;
const AUDITION_WINDOW = 60 * 60_000;

const PHOTOS_DIR = path.join(process.cwd(), "public", "auditions");
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function savePhoto(file: File): Promise<string> {
  await fs.mkdir(PHOTOS_DIR, { recursive: true });
  const ext = MIME_TO_EXT[file.type];
  if (!ext) throw new Error("프로필 사진은 JPEG / PNG / WebP / HEIC 만 됩니다.");
  if (file.size > MAX_PHOTO_BYTES) throw new Error("프로필 사진은 8MB 이하로 올려주세요.");
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const filepath = path.join(PHOTOS_DIR, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buf);
  return `/auditions/${filename}`;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`audition:${ip}`, AUDITION_LIMIT, AUDITION_WINDOW);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `잠시 후 다시 시도해주세요. (${rl.retryAfter}초)` },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart/form-data 형식으로 보내주세요." },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : "";
  };

  const name = get("name");
  const ageRaw = get("age");
  const age = ageRaw ? Number(ageRaw) : null;
  const gender = get("gender") || null;
  const phone = get("phone") || null;
  const email = get("email");
  const experience = get("experience") || null;
  const role_preference = get("role_preference") || null;
  const intro = get("intro");
  const portfolio_url = get("portfolio_url") || null;
  const photo = form.get("photo");

  // Listing — required. Submissions must target a specific open audition call.
  const listingIdRaw = get("listing_id");
  const listing_id = listingIdRaw ? Number(listingIdRaw) : NaN;
  if (!Number.isFinite(listing_id)) {
    return NextResponse.json(
      { error: "지원할 공고를 먼저 선택해주세요." },
      { status: 400 },
    );
  }
  if (!isAcceptingApplications(listing_id)) {
    return NextResponse.json(
      { error: "이 공고는 더 이상 지원을 받지 않습니다." },
      { status: 409 },
    );
  }

  // Validate text fields
  if (!name || name.length > 50) {
    return NextResponse.json(
      { error: "이름을 1~50자 사이로 입력해주세요." },
      { status: 400 },
    );
  }
  if (!email || !isEmail(email)) {
    return NextResponse.json(
      { error: "이메일 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }
  if (!intro || intro.length < 10) {
    return NextResponse.json(
      { error: "자기소개는 최소 10자 이상 작성해주세요." },
      { status: 400 },
    );
  }
  if (intro.length > 2000) {
    return NextResponse.json(
      { error: "자기소개는 2000자 이하로 작성해주세요." },
      { status: 400 },
    );
  }

  // Photo is now mandatory.
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json(
      { error: "프로필 사진을 첨부해주세요. (필수)" },
      { status: 400 },
    );
  }

  let photo_url: string;
  try {
    photo_url = await savePhoto(photo);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "사진 저장 실패" },
      { status: 400 },
    );
  }

  const stmt = db.prepare(`
    INSERT INTO auditions
      (name, age, gender, phone, email, experience, role_preference, intro, portfolio_url, photo_url, listing_id)
    VALUES
      (@name, @age, @gender, @phone, @email, @experience, @role_preference, @intro, @portfolio_url, @photo_url, @listing_id)
  `);

  const result = stmt.run({
    name,
    age,
    gender,
    phone,
    email,
    experience,
    role_preference,
    intro,
    portfolio_url,
    photo_url,
    listing_id,
  });

  return NextResponse.json(
    { ok: true, id: result.lastInsertRowid },
    { status: 201 },
  );
}
