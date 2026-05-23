import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { V2Header, V2Footer } from "../../page";
import { InView } from "@/components/Stagger";
import { findMember, getMembers } from "@/lib/members";
import { storageUrl } from "@/lib/db";
import { getAllVideos } from "@/lib/youtube";

export const dynamic = "force-dynamic";

function photoUrlFor(photoPath?: string) {
  return photoPath ? storageUrl("members", photoPath) : null;
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const member = await findMember(decoded);
  if (!member) return { title: "멤버를 찾을 수 없어요" };

  const photo = photoUrlFor(member.photoPath);
  const canonicalPath = `/v2/members/${encodeURIComponent(member.slug)}`;
  return {
    title: `${member.name} · ${member.roleLabel}`,
    description:
      member.highlight ||
      member.bio ||
      `치즈필름의 ${member.roleLabel}, ${member.name}.`,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: `${member.name} | 치즈필름`,
      description: member.highlight || member.bio,
      type: "profile",
      url: canonicalPath,
      // Photo wins as og:image; fall back to the brand logo so cards
      // still render for members without an upload.
      images: photo ? [{ url: photo, alt: member.name }] : ["/cheeze-logo.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${member.name} · ${member.roleLabel}`,
      description: member.highlight || member.bio,
      images: photo ? [photo] : ["/cheeze-logo.png"],
    },
  };
}

export default async function MemberDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const member = await findMember(slug);
  if (!member) notFound();

  const photo = photoUrlFor(member.photoPath);

  // Cross-reference recent videos where this member is in the cast.
  // `cast` info we extracted earlier lives in `member.works[]` (video
  // titles). Match against actual videos to render thumbnails + dates.
  const [videosResult, all] = await Promise.all([
    getAllVideos().catch(() => ({ videos: [] })),
    getMembers(),
  ]);
  const { videos } = videosResult;
  const workSet = new Set(member.works);
  const appearances = videos
    .filter((v) => workSet.has(v.title))
    .slice(0, 6);
  const idx = all.findIndex((m) => m.slug === member.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial flex flex-col">
      <V2Header />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 grid lg:grid-cols-12 gap-x-10 gap-y-10">
          {/* Crumb + portrait */}
          <InView className="v2-fade-up lg:col-span-5">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive mb-5">
              <Link href="/v2/members" className="hover:text-cheeze-purple">
                ← Cast
              </Link>
              <span className="mx-2 text-cheeze-olive/40">/</span>
              <span className="text-cheeze-purple-deep">
                No.{String(idx + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="v2-film aspect-[3/4] relative overflow-hidden bg-cheeze-purple-deep">
              {photo ? (
                <Image
                  src={photo}
                  alt={member.name}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0 grid place-items-center text-[14rem] text-cheeze-yellow"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {member.name.charAt(0)}
                </span>
              )}
              <div className="absolute top-4 left-4 text-cheeze-yellow font-mono text-xs tracking-[0.3em]">
                № {String(idx + 1).padStart(2, "0")}
              </div>
            </div>
          </InView>

          {/* Copy */}
          <div className="lg:col-span-7 flex flex-col">
            <InView className="v2-fade-up">
              <div className="text-[11px] tracking-[0.45em] uppercase text-cheeze-purple mb-3">
                {member.roleLabel}
                {member.uncertain && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    추정
                  </span>
                )}
              </div>
              <h1
                className="leading-[0.95] tracking-tight"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.6rem, 6vw, 5rem)",
                }}
              >
                {member.name}
              </h1>
              {member.nameEn && (
                <div className="mt-2 text-cheeze-olive tracking-widest uppercase text-sm">
                  {member.nameEn}
                </div>
              )}
              {member.highlight && (
                <p className="mt-6 italic text-cheeze-purple-deep text-xl leading-snug max-w-prose">
                  “{member.highlight}”
                </p>
              )}
              {member.bio && (
                <p className="mt-5 text-cheeze-ink-soft leading-relaxed max-w-prose">
                  {member.bio}
                </p>
              )}

              {/* Quick facts */}
              <dl className="mt-8 grid sm:grid-cols-[7rem_1fr] gap-x-6 gap-y-3 text-sm">
                {member.joinedNote && (
                  <>
                    <dt className="text-[10px] tracking-widest uppercase text-cheeze-olive pt-1">
                      합류
                    </dt>
                    <dd className="text-cheeze-ink-soft">
                      {member.joinedNote}
                    </dd>
                  </>
                )}
                {member.instagram && (
                  <>
                    <dt className="text-[10px] tracking-widest uppercase text-cheeze-olive pt-1">
                      Instagram
                    </dt>
                    <dd>
                      <a
                        href={`https://www.instagram.com/${member.instagram}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cheeze-purple hover:text-cheeze-purple-deep underline underline-offset-4 decoration-cheeze-purple/40 hover:decoration-cheeze-purple"
                      >
                        @{member.instagram} ↗
                      </a>
                    </dd>
                  </>
                )}
                {member.sourceUrl && (
                  <>
                    <dt className="text-[10px] tracking-widest uppercase text-cheeze-olive pt-1">
                      Source
                    </dt>
                    <dd>
                      <a
                        href={member.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cheeze-purple hover:text-cheeze-purple-deep underline underline-offset-4 break-all"
                      >
                        {member.sourceUrl} ↗
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            </InView>
          </div>
        </div>
      </section>

      {/* ── APPEARANCES ──────────────────────────────── */}
      {appearances.length > 0 && (
        <section className="border-b border-cheeze-purple-deep/15">
          <div className="mx-auto max-w-[100rem] px-6 py-16">
            <InView className="v2-fade-up">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
                — Appearances
              </div>
              <h2
                className="mt-2 text-3xl md:text-4xl tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {member.name}이 출연한 작품
                <span className="text-cheeze-olive font-normal text-base ml-3 tracking-normal">
                  ({appearances.length}편)
                </span>
              </h2>
            </InView>

            <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {appearances.map((v) => (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group block v2-film"
                >
                  <div className="aspect-[16/10] relative overflow-hidden bg-cheeze-charcoal">
                    <Image
                      src={v.thumbnail}
                      alt={v.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/60 via-transparent to-transparent" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold leading-snug text-cheeze-ink line-clamp-2 group-hover:text-cheeze-purple transition-colors">
                    {v.title}
                  </h3>
                  <div className="mt-1 text-[11px] tracking-widest uppercase text-cheeze-olive">
                    {new Date(v.publishedAt).toLocaleDateString("ko-KR")}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PREV / NEXT NAV ──────────────────────────── */}
      <section className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-10 grid grid-cols-2 gap-6">
          <div>
            {prev ? (
              <Link
                href={`/v2/members/${encodeURIComponent(prev.slug)}`}
                className="group block"
              >
                <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive mb-2">
                  ← Previous
                </div>
                <div
                  className="text-2xl md:text-3xl text-cheeze-ink group-hover:text-cheeze-purple transition-colors tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {prev.name}
                </div>
                <div className="text-xs text-cheeze-olive mt-1">
                  {prev.roleLabel}
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
          <div className="text-right">
            {next ? (
              <Link
                href={`/v2/members/${encodeURIComponent(next.slug)}`}
                className="group block"
              >
                <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive mb-2">
                  Next →
                </div>
                <div
                  className="text-2xl md:text-3xl text-cheeze-ink group-hover:text-cheeze-purple transition-colors tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {next.name}
                </div>
                <div className="text-xs text-cheeze-olive mt-1">
                  {next.roleLabel}
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </section>

      <V2Footer />
    </main>
  );
}
