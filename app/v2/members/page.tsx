import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { V2Header, V2Footer } from "../page";
import { InView } from "@/components/Stagger";
import { members } from "@/lib/members";

export const dynamic = "force-dynamic";
export const metadata = { title: "캐스트 | 치즈필름 02", description: "Editorial cast roster." };

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
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

export default function V2MembersPage() {
  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial">
      <V2Header />

      <section className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-12 gap-x-10 gap-y-8">
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
            <Link href="/v2/support?tab=fan" className="text-cheeze-purple underline-offset-4 hover:underline">
              여기로
            </Link>{" "}
            알려주세요.
          </InView>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
          {members.map((m, i) => {
            const photo = resolvePhoto(m.slug);
            return (
              <InView
                key={m.slug}
                as="article"
                className="v2-fade-up"
                style={{ transitionDelay: `${(i % 3) * 80}ms` } as React.CSSProperties}
              >
                <div className="v2-film aspect-[3/4] bg-cheeze-purple-deep relative overflow-hidden">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt={m.name}
                      className="absolute inset-0 w-full h-full object-cover"
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
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="text-[10px] tracking-[0.3em] uppercase text-cheeze-cream/85">
                      {m.roleLabel}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
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
                  <div className="mt-4 flex items-center gap-3 text-[11px]">
                    {m.joinedNote && (
                      <span className="border border-cheeze-purple-deep/40 px-2 py-1 tracking-widest uppercase">
                        {m.joinedNote}
                      </span>
                    )}
                    {m.instagram && (
                      <a
                        href={`https://www.instagram.com/${m.instagram}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cheeze-purple hover:text-cheeze-purple-deep tracking-widest"
                      >
                        @{m.instagram} ↗
                      </a>
                    )}
                  </div>
                </div>
              </InView>
            );
          })}
        </div>
      </section>

      <V2Footer />
    </main>
  );
}
