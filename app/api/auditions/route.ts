import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { serverClient } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isAcceptingApplications } from "@/lib/auditionListings";
import {
  computeAgeFromBirthdate,
  isValidBirthdate,
  isValidKoreanPhone,
} from "@/lib/koreanFormat";

export const runtime = "nodejs";

// Spam guard: at most 5 audition submissions per hour per IP.
const AUDITION_LIMIT = 5;
const AUDITION_WINDOW = 60 * 60_000;

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

/**
 * Save the applicant's photo to the `auditions` Storage bucket (private —
 * admins read via signed URLs). Returns the storage key so we can drop it
 * straight into the `photo_url` column.
 */
async function savePhoto(file: File): Promise<string> {
  const ext = MIME_TO_EXT[file.type];
  if (!ext) throw new Error("프로필 사진은 JPEG / PNG / WebP / HEIC 만 됩니다.");
  if (file.size > MAX_PHOTO_BYTES)
    throw new Error("프로필 사진은 8MB 이하로 올려주세요.");
  const key = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const sb = serverClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage
    .from("auditions")
    .upload(key, buf, { contentType: file.type, upsert: false });
  if (error) throw new Error(`사진 저장 실패: ${error.message}`);
  // Store the bucket-relative key. Admin UI builds a signed URL when
  // it needs to display the photo (private bucket).
  return key;
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
  // Birthdate is the new primary — `age` is derived from it. Older
  // clients can still send raw `age` and we keep it.
  const birthdate = get("birthdate") || null;
  const ageRaw = get("age");
  let age = ageRaw ? Number(ageRaw) : null;
  if (birthdate) {
    if (!isValidBirthdate(birthdate)) {
      return NextResponse.json(
        { error: "생년월일을 YYYY-MM-DD 형식으로 입력해주세요." },
        { status: 400 },
      );
    }
    age = computeAgeFromBirthdate(birthdate);
  }
  const gender = get("gender") || null;
  const phone = get("phone") || null;
  if (phone && !isValidKoreanPhone(phone)) {
    return NextResponse.json(
      { error: "연락처는 010-XXXX-XXXX 형식으로 입력해주세요." },
      { status: 400 },
    );
  }
  const email = get("email");
  const experience = get("experience") || null;
  const role_preference = get("role_preference") || null;
  const intro = get("intro");
  const portfolio_url = get("portfolio_url") || null;
  // Collect up to 3 photos. `photo` is the primary; `photo2` /
  // `photo3` are optional. Filter to actual File entries (FormData
  // includes empty File objects when the input was untouched).
  const photoFiles: File[] = (["photo", "photo2", "photo3"] as const)
    .map((k) => form.get(k))
    .filter((v): v is File => v instanceof File && v.size > 0);
  const photo = photoFiles[0] ?? null;

  // Listing — required. Submissions must target a specific open audition call.
  const listingIdRaw = get("listing_id");
  const listing_id = listingIdRaw ? Number(listingIdRaw) : NaN;
  if (!Number.isFinite(listing_id)) {
    return NextResponse.json(
      { error: "지원할 공고를 먼저 선택해주세요." },
      { status: 400 },
    );
  }
  if (!(await isAcceptingApplications(listing_id))) {
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

  // At least one photo required.
  if (!photo) {
    return NextResponse.json(
      { error: "프로필 사진을 1장 이상 첨부해주세요." },
      { status: 400 },
    );
  }

  // Save every uploaded photo to Storage. Stops at 3 even if more
  // somehow get through.
  let photoKeys: string[];
  try {
    photoKeys = await Promise.all(
      photoFiles.slice(0, 3).map((f) => savePhoto(f)),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "사진 저장 실패" },
      { status: 400 },
    );
  }
  const photo_url = photoKeys[0];

  const sb = serverClient();
  // First attempt: insert with the new `photo_urls` array column so
  // all 3 keys are preserved. If the column doesn't exist yet (admin
  // hasn't run the schema migration), retry without it — single-photo
  // workflows still work via the legacy `photo_url`.
  let inserted = await sb
    .from("auditions")
    .insert({
      name,
      age,
      birthdate,
      gender,
      phone,
      email,
      experience,
      role_preference,
      intro,
      portfolio_url,
      photo_url,
      photo_urls: photoKeys,
      listing_id,
    })
    .select("id")
    .single();
  if (
    inserted.error &&
    /photo_urls/.test(inserted.error.message ?? "")
  ) {
    console.warn(
      "[auditions.POST] photo_urls column missing — falling back to single-photo insert. Apply supabase/schema.sql migration.",
    );
    inserted = await sb
      .from("auditions")
      .insert({
        name,
        age,
        birthdate,
        gender,
        phone,
        email,
        experience,
        role_preference,
        intro,
        portfolio_url,
        photo_url,
        listing_id,
      })
      .select("id")
      .single();
  }
  const { data, error } = inserted;
  if (error) {
    console.error("[auditions.POST]", error);
    return NextResponse.json(
      { error: "지원서 저장 중 문제가 발생했어요." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { ok: true, id: (data as { id: number }).id },
    { status: 201 },
  );
}
