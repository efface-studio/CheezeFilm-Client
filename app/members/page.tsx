import Image from "next/image";
import Link from "next/link";
import { V2Header, V2Footer } from "../page";
import { InView } from "@/components/Stagger";
import { getMembers } from "@/lib/members";
import { storageUrl } from "@/lib/db";

// Members rarely change; the cached list comes from `getMembers()`
// (unstable_cache, tag: "members"). Admin writes flush via revalidateTag.
export const revalidate = 300;
export const metadata = {
  title: "캐스트 · The Cast",
  description:
    "치즈필름의 카메라 앞과 뒤, 함께 한 컷을 굽는 사람들. 배우·작가·연출의 명단을 한 페이지에서.",
  alternates: { canonical: "/members" },
  openGraph: {
    title: "캐스트 · The Cast | 치즈필름",
    description: "치즈필름의 배우·작가·연출의 명단.",
    url: "/members",
    type: "website",
    images: ["/cheeze-logo.png"],
  },
  twitter: { images: ["/cheeze-logo.png"] },
};

// Photos live in Supabase Storage now. `member.photoPath` is the key
// inside the `members` bucket — we just build a public URL from it.
function photoUrlFor(photoPath?: string) {
  return photoPath ? storageUrl("members", photoPath) : null;
}

export default async function V2MembersPage() {
  const members = await getMembers();
  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial flex flex-col">
      <V2Header />

      <section className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 grid lg:grid-cols-12 gap-x-10 gap-y-8">
          <InView className="v2-fade-up lg:col-span-2">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Cast & Crew</div>
            <div className="mt-2 text-[3rem] leading-none text-cheeze-purple" style={{ fontFamily: "var(--font-display)" }}>
              03
            </div>
          </InView>
          <InView className="v2-fade-up v2-title lg:col-span-7">
            <h1
              className="text-5xl md:text-7xl tracking-[-0.02em] leading-[0.95]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              The Cast.
            </h1>
            <p className="mt-5 text-cheeze-ink-soft max-w-xl">
              카메라 앞과 뒤, 함께 한 컷을 굽는 사람들. {members.length}명의 명단.
            </p>
          </InView>
          <InView className="v2-fade-up lg:col-span-3 lg:text-right text-xs text-cheeze-olive tracking-widest uppercase leading-relaxed">
            정보는 공식 인스타그램·위키트리·위키백과를 교차 확인했어요. 잘못된 부분은 {" "}
            <Link href="/support?tab=fan" className="text-cheeze-purple underline-offset-4 hover:underline">
              여기로
            </Link>{" "}
            알려주세요.
          </InView>
        </div>
      </section>

      <section className="mx-auto max-w-[100rem] px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
          {members.map((m, i) => {
            const photo = photoUrlFor(m.photoPath);
            return (
              <InView
                key={m.slug}
                as="article"
                className="v2-fade-up group"
                style={{ transitionDelay: `${(i % 3) * 80}ms` } as React.CSSProperties}
              >
                {/* Card is now a Link to the member's detail page — the
                    Instagram anchor and the wrapping link both fire on
                    click, so we stop propagation on the Instagram link
                    below to keep it pointing at the IG profile. */}
                <Link
                  href={`/members/${encodeURIComponent(m.slug)}`}
                  className="block"
                >
                  <div className="v2-film aspect-[3/4] bg-cheeze-purple-deep relative overflow-hidden">
                    {photo ? (
                      <Image
                        src={photo}
                        alt={m.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        // 첫 6장만 viewport 안에 들 가능성 큰 LCP 후보 — priority
                        priority={i < 6}
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="absolute inset-0 grid place-items-center text-[10rem] text-cheeze-yellow"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {m.name.charAt(0)}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-cheeze-charcoal/85 via-cheeze-charcoal/0 to-transparent" />
                    <div className="absolute top-3 left-4 text-cheeze-yellow font-mono text-[11px] tracking-[0.3em]">
                      № {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 flex items-center justify-between">
                      <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-cream/85">
                        {m.roleLabel}
                      </div>
                      <span className="text-cheeze-yellow text-xs tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        프로필 →
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl tracking-tight group-hover:text-cheeze-purple transition-colors" style={{ fontFamily: "var(--font-display)" }}>
                      {m.name}{" "}
                      <span className="text-cheeze-olive text-xs uppercase tracking-widest font-normal">
                        {m.nameEn}
                      </span>
                    </h3>
                    <p className="mt-2 italic text-cheeze-purple-deep text-sm">“{m.highlight}”</p>
                    <p className="mt-3 text-[14px] text-cheeze-ink-soft leading-relaxed">{m.bio}</p>
                    <ul className="mt-3 text-[12px] text-cheeze-olive space-y-1">
                      {m.works.map((w) => (
                        <li key={w}>· {w}</li>
                      ))}
                    </ul>
                    {/* Instagram handle moved off the grid card — nested
                        anchors are invalid HTML and we now have a member
                        detail page that exposes the IG link cleanly. */}
                    <div className="mt-4 flex items-center gap-3 text-[11px]">
                      {m.joinedNote && (
                        <span className="border border-cheeze-purple-deep/40 px-2 py-1 tracking-widest uppercase">
                          {m.joinedNote}
                        </span>
                      )}
                      {m.instagram && (
                        <span className="text-cheeze-olive tracking-widest">
                          @{m.instagram}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </InView>
            );
          })}
        </div>
      </section>

      <V2Footer />
    </main>
  );
}
