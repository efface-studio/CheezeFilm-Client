import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "../../page";
import { InView } from "@/components/Stagger";
import { findMember, getMembers } from "@/lib/members";
// findMember is still used by generateMetadata which only needs a single
// row; the page itself now reads from the cached full list (see below).
import { storageUrl } from "@/lib/db";
import { getAllVideos } from "@/lib/youtube";
import { getServerLang } from "@/lib/i18n.server";
import { translateRoleLabel } from "@/lib/i18n";
import { resolveMemberNameEn } from "@/lib/koreanRomanizer";

// `[slug]` is a dynamic segment but the page data (`findMember`,
// `getAllVideos`, `getMembers`) is all cross-request cached. With
// `revalidate` we serve cached HTML for `revalidate` seconds and
// regenerate in the background after that.
export const revalidate = 300;

/**
 * Pre-collect every member's slug at build time so Next.js can prerender
 * them once and serve them straight from the edge cache thereafter.
 *
 * Vercel's build environment doesn't always expose `SUPABASE_*`
 * (depending on env-scoping), and `getMembers()` throws when they're
 * missing — so we guard against that and fall back to "no prerender,
 * generate on first request" instead of failing the build. Unknown
 * slugs continue to resolve at request time either way.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return [];
  }
  try {
    const all = await getMembers();
    return all.map((m) => ({ slug: m.slug }));
  } catch (err) {
    console.warn(
      "[members/[slug]] skipping prerender — getMembers failed:",
      err,
    );
    return [];
  }
}

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
  const canonicalPath = `/members/${encodeURIComponent(member.slug)}`;
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

  // Fetch language + the full member list + videos in parallel. The full
  // list serves three purposes: (a) the actual member lookup by slug,
  // (b) the prev/next navigation, (c) the position index in the No.X
  // crumb. Previously this called `findMember` *and* `getMembers`
  // separately — two round-trips, even though `getMembers` already
  // contains the row we need. (Both are unstable_cache'd so the
  // practical cost was a duplicate cache deserialization rather than
  // two Supabase hits, but the simplification is also nice.)
  const [lang, all, videosResult] = await Promise.all([
    getServerLang(),
    getMembers(),
    getAllVideos().catch(() => ({ videos: [] })),
  ]);
  const member = all.find((m) => m.slug === slug);
  if (!member) notFound();

  const photo = photoUrlFor(member.photoPath);
  const displayName = lang === "en"
    ? resolveMemberNameEn(member.name, member.nameEn)
    : member.name;
  const secondaryName = lang === "en"
    ? member.name
    : (member.nameEn || resolveMemberNameEn(member.name, member.nameEn));
  const localeStr = lang === "en" ? "en-US" : "ko-KR";

  // Cross-reference recent videos where this member is in the cast.
  // `cast` info we extracted earlier lives in `member.works[]` (video
  // titles). Match against actual videos to render thumbnails + dates.
  const { videos } = videosResult;
  const workSet = new Set(member.works);
  const matchedAppearances = videos.filter((v) => workSet.has(v.title));
  const appearances = matchedAppearances.slice(0, 12);
  const idx = all.findIndex((m) => m.slug === member.slug);
  const prev = idx > 0 ? all[idx - 1] : null;
  const next = idx < all.length - 1 ? all[idx + 1] : null;

  // Quick stats for the side panel
  const totalAppearances = member.works.length;
  const latestAppearance = matchedAppearances.length > 0
    ? matchedAppearances.reduce((a, b) =>
        new Date(a.publishedAt) > new Date(b.publishedAt) ? a : b,
      )
    : null;
  const yearsActive = (() => {
    if (matchedAppearances.length === 0) return null;
    const years = matchedAppearances.map((v) => new Date(v.publishedAt).getFullYear());
    const min = Math.min(...years);
    const max = Math.max(...years);
    return min === max ? `${min}` : `${min}–${max}`;
  })();

  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial flex flex-col">
      <SiteHeader />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 grid lg:grid-cols-12 gap-x-10 gap-y-10">
          {/* Crumb + portrait */}
          <InView className="fade-up lg:col-span-5">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive mb-5">
              <Link href="/members" className="hover:text-cheeze-purple">
                ← Cast
              </Link>
              <span className="mx-2 text-cheeze-olive/40">/</span>
              <span className="text-cheeze-purple-deep">
                No.{String(idx + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="film aspect-[3/4] relative overflow-hidden bg-cheeze-purple-deep">
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
            <InView className="fade-up">
              <div className="text-[11px] tracking-[0.45em] uppercase text-cheeze-purple mb-3">
                {translateRoleLabel(member.roleLabel, lang)}
                {member.uncertain && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    {lang === "en" ? "Estimated" : "추정"}
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
                {displayName}
              </h1>
              {secondaryName && secondaryName !== displayName && (
                <div className="mt-2 text-cheeze-olive tracking-widest uppercase text-sm">
                  {secondaryName}
                </div>
              )}
              {member.highlight && (
                <p className="mt-6 italic text-cheeze-purple-deep text-xl leading-snug max-w-prose">
                  “{lang === "en" && /^\d+편\s*출연$/.test(member.highlight.trim())
                    ? `${totalAppearances} appearance${totalAppearances === 1 ? "" : "s"}`
                    : member.highlight}”
                </p>
              )}
              {member.bio && (
                <p className="mt-5 text-cheeze-ink-soft leading-relaxed max-w-prose">
                  {member.bio}
                </p>
              )}

              {/* Quick-stat tiles — fill the otherwise-empty right
                  column with at-a-glance info: total appearances,
                  years active, latest film. Hidden when there's
                  literally nothing to show. */}
              {(totalAppearances > 0 || yearsActive || latestAppearance) && (
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl">
                  {totalAppearances > 0 && (
                    <div className="rounded-2xl bg-toss-50 px-4 py-3">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-cheeze-olive">
                        {lang === "en" ? "Appearances" : "출연"}
                      </div>
                      <div className="mt-1 text-2xl font-bold text-cheeze-ink tabular-nums">
                        {totalAppearances}
                        {lang !== "en" && <span className="text-base font-normal text-cheeze-ink-soft ml-1">편</span>}
                      </div>
                    </div>
                  )}
                  {yearsActive && (
                    <div className="rounded-2xl bg-toss-50 px-4 py-3">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-cheeze-olive">
                        {lang === "en" ? "Years active" : "활동 기간"}
                      </div>
                      <div className="mt-1 text-2xl font-bold text-cheeze-ink tabular-nums">
                        {yearsActive}
                      </div>
                    </div>
                  )}
                  {latestAppearance && (
                    <div className="rounded-2xl bg-toss-50 px-4 py-3 sm:col-span-1 col-span-2">
                      <div className="text-[10px] tracking-[0.25em] uppercase text-cheeze-olive">
                        {lang === "en" ? "Latest" : "최근작"}
                      </div>
                      <div className="mt-1 text-sm font-bold text-cheeze-ink line-clamp-2 leading-snug">
                        {latestAppearance.title}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Quick facts */}
              <dl className="mt-8 grid sm:grid-cols-[7rem_1fr] gap-x-6 gap-y-3 text-sm">
                {member.joinedNote && (
                  <>
                    <dt className="text-[10px] tracking-widest uppercase text-cheeze-olive pt-1">
                      {/* Admins use `joinedNote` for two different
                          things: actual join date (e.g. "2024.03") and
                          birth year (e.g. "1999년생"). Detect the
                          "년생" suffix and switch the label so it
                          reads correctly instead of mislabelling a
                          birth year as "합류". */}
                      {/년생$/.test(member.joinedNote)
                        ? (lang === "en" ? "Born" : "년생")
                        : (lang === "en" ? "Joined" : "합류")}
                    </dt>
                    <dd className="text-cheeze-ink-soft">
                      {/년생$/.test(member.joinedNote) && lang === "en"
                        ? member.joinedNote.replace(/년생$/, "")
                        : member.joinedNote}
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

              {/* CTA row — gives users somewhere to go and fills more
                  of the column for low-credit members. */}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/support?tab=fan"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cheeze-purple-deep text-white text-[13px] font-semibold hover:bg-cheeze-purple transition-colors"
                >
                  {lang === "en" ? "Send a fan letter" : "응원 메시지 보내기"}
                  <span aria-hidden>→</span>
                </Link>
                <Link
                  href="/members"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-toss-50 text-cheeze-ink text-[13px] font-semibold hover:bg-toss-100 transition-colors"
                >
                  {lang === "en" ? "All members" : "전체 멤버 보기"}
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </InView>
          </div>
        </div>
      </section>

      {/* ── APPEARANCES ──────────────────────────────── */}
      {appearances.length > 0 && (
        <section className="border-b border-cheeze-purple-deep/15">
          <div className="mx-auto max-w-[100rem] px-6 py-16">
            <InView className="fade-up">
              <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">
                — Appearances
              </div>
              <h2
                className="mt-2 text-3xl md:text-4xl tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {lang === "en"
                  ? `${displayName}'s appearances`
                  : `${member.name}이 출연한 작품`}
                <span className="text-cheeze-olive font-normal text-base ml-3 tracking-normal">
                  {lang === "en"
                    ? `(${appearances.length})`
                    : `(${appearances.length}편)`}
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
                  className="group block film"
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
                    {new Date(v.publishedAt).toLocaleDateString(localeStr)}
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PREV / NEXT NAV ──────────────────────────── */}
      <section className="border-b border-cheeze-purple-deep/15">
        {/* On phone the 2-col grid crushed prev/next into ~140px
            columns and the member-name display text wrapped mid-syllable.
            Stack vertically below sm: prev on top, next below — the
            text-right next still sits flush right on mobile so the
            chevron arrow direction stays consistent. */}
        <div className="mx-auto max-w-[100rem] px-6 py-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            {prev ? (
              <Link
                href={`/members/${encodeURIComponent(prev.slug)}`}
                className="group block"
              >
                <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive mb-2">
                  ← Previous
                </div>
                <div
                  className="text-2xl md:text-3xl text-cheeze-ink group-hover:text-cheeze-purple transition-colors tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {lang === "en" ? resolveMemberNameEn(prev.name, prev.nameEn) : prev.name}
                </div>
                <div className="text-xs text-cheeze-olive mt-1">
                  {translateRoleLabel(prev.roleLabel, lang)}
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
          <div className="text-right">
            {next ? (
              <Link
                href={`/members/${encodeURIComponent(next.slug)}`}
                className="group block"
              >
                <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive mb-2">
                  Next →
                </div>
                <div
                  className="text-2xl md:text-3xl text-cheeze-ink group-hover:text-cheeze-purple transition-colors tracking-tight"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {lang === "en" ? resolveMemberNameEn(next.name, next.nameEn) : next.name}
                </div>
                <div className="text-xs text-cheeze-olive mt-1">
                  {translateRoleLabel(next.roleLabel, lang)}
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
