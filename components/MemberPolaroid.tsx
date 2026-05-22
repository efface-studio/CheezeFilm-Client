import fs from "node:fs";
import path from "node:path";
import type { Member } from "@/lib/members";
import { getRoleColorClass } from "@/lib/members";

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Look for /public/members/<slug>.{jpg|jpeg|png|webp}. Returns the public URL
 * if found, with a cache-busting `?v=<mtime>` query so admin uploads reflect
 * immediately without manual cache clear.
 */
function resolvePhoto(slug: string) {
  const dir = path.join(process.cwd(), "public", "members");
  for (const ext of IMAGE_EXTS) {
    const file = path.join(dir, `${slug}${ext}`);
    if (fs.existsSync(file)) {
      const v = fs.statSync(file).mtimeMs;
      return `/members/${slug}${ext}?v=${Math.floor(v)}`;
    }
  }
  return null;
}

export default function MemberPolaroid({
  member,
  rotateDeg = 0,
  size = "md",
}: {
  member: Member;
  rotateDeg?: number;
  size?: "md" | "lg";
}) {
  const photo = resolvePhoto(member.slug);
  const initial = member.name.charAt(0);

  // size config
  const widthClass = size === "lg" ? "w-full max-w-[280px]" : "w-full";
  const innerHeight = size === "lg" ? "aspect-[3/4]" : "aspect-[4/5]";

  return (
    <div
      className={`bg-white border-2 border-cheeze-ink shadow-[6px_6px_0_var(--cheeze-ink)] ${widthClass}`}
      style={{ transform: `rotate(${rotateDeg}deg)` }}
    >
      <div
        className={`${innerHeight} relative overflow-hidden border-b-2 border-cheeze-ink ${getRoleColorClass(
          member.accent,
        )}`}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={member.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <>
            <span
              aria-hidden
              className="absolute inset-0 grid place-items-center text-[12rem] leading-none opacity-95"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {initial}
            </span>
            <span className="absolute bottom-2 right-2 text-[10px] tracking-[0.25em] uppercase opacity-80">
              No Photo
            </span>
          </>
        )}

        <span className="absolute top-2 left-2 text-[10px] uppercase tracking-[0.25em] bg-cheeze-purple-deep/85 text-cheeze-cream px-2 py-0.5">
          {member.roleLabel}
        </span>
      </div>

      <div
        className="text-center py-3 px-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <div className="text-xl leading-tight">{member.name}</div>
        <div className="text-[10px] tracking-[0.25em] uppercase text-cheeze-olive mt-1">
          {member.nameEn}
        </div>
      </div>
    </div>
  );
}
