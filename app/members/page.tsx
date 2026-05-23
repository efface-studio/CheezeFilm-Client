import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import MemberPolaroid from "@/components/MemberPolaroid";
import Reveal from "@/components/Reveal";
import { getMembers } from "@/lib/members";

export const metadata = {
  title: "멤버 | 치즈필름",
  description:
    "치즈필름을 만드는 사람들. 카메라 앞과 뒤에서 한 장면씩 굽고 있는 멤버 소개.",
};

// We probe the filesystem (public/members/<slug>.*) on each request so dropping
// a new photo into the folder reflects immediately without a rebuild.
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await getMembers();
  // Stable but visually varied rotations so it feels hand-pinned to a wall.
  const rotations = [-3, 2, -1.5, 3, -2.5, 1.5, -3.5, 2.5];

  return (
    <>
      <SiteHeader />

      {/* Hero */}
      <section className="relative border-b-2 border-cheeze-ink">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 400px at 20% -10%, rgba(85,34,163,0.42), transparent 60%), radial-gradient(700px 400px at 110% 110%, rgba(250,190,75,0.2), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <span className="tape text-xs">THE CAST · STAFF WALL</span>
          <h1
            className="mt-5 leading-[0.95] text-cheeze-ink"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 7vw, 5rem)",
            }}
          >
            우리를 굽는 <br />
            <span className="text-cheeze-purple">사람들.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-cheeze-ink-soft leading-relaxed">
            카메라 앞과 뒤에서, 한 장면씩 함께 굽고 있는 사람들입니다. 카드에
            걸린 사진은 폴라로이드 한 장의 자리예요 — 실제 사진은{" "}
            <code className="bg-cheeze-cream-deep px-1">
              public/members/&lt;slug&gt;.jpg
            </code>{" "}
            에 넣으면 자동으로 들어옵니다.
          </p>
        </div>
      </section>

      {/* Wall of polaroids */}
      <section className="relative">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "repeating-linear-gradient(90deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 28px)",
          }}
        />
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
            {members.map((m, i) => (
              <Reveal
                as="article"
                key={m.slug}
                delay={i * 90}
                className="reveal relative flex flex-col items-center text-center"
              >
                {/* "Pin" — pulses like a tiny LED on a wall map */}
                <span
                  aria-hidden
                  className="pin-pulse block w-3 h-3 rounded-full bg-cheeze-wine border-2 border-cheeze-purple-deep mb-[-6px] relative z-10"
                  style={
                    {
                      "--pulse-delay": `${(i % 4) * 0.4}s`,
                    } as React.CSSProperties
                  }
                />
                <div
                  className="sway w-full max-w-[280px]"
                  style={
                    {
                      "--sway-rest": `${rotations[i % rotations.length]}deg`,
                      "--sway-amp": "1.1deg",
                      "--sway-delay": `${(i % 5) * 0.7}s`,
                    } as React.CSSProperties
                  }
                >
                  <MemberPolaroid member={m} rotateDeg={0} size="md" />
                </div>

                <div className="mt-5 max-w-[320px] w-full">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-cheeze-purple mb-2">
                    “{m.highlight}”
                    {m.uncertain && (
                      <span className="ml-2 text-cheeze-olive normal-case tracking-normal">
                        · 정보 일부 추정
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-cheeze-ink-soft text-left sm:text-center">
                    {m.bio}
                  </p>

                  <ul className="mt-4 space-y-1 text-xs text-cheeze-olive text-left sm:text-center">
                    {m.works.map((w) => (
                      <li key={w}>· {w}</li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-center gap-3 flex-wrap text-xs">
                    {m.joinedNote && (
                      <span className="stamp text-cheeze-ink text-[10px]">
                        {m.joinedNote}
                      </span>
                    )}
                    {m.instagram && (
                      <a
                        href={`https://www.instagram.com/${m.instagram}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4 hover:text-cheeze-purple"
                      >
                        📸 @{m.instagram}
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-20 border-t-2 border-dashed border-cheeze-ink/30 pt-10 text-sm text-cheeze-ink-soft/80 leading-relaxed text-center max-w-2xl mx-auto">
            정보는 공식 인스타그램·위키백과·위키트리 인터뷰를 교차 확인해
            정리했어요. 잘못된 내용이 보이면{" "}
            <Link
              href="/support?tab=fan"
              className="underline hover:text-cheeze-purple"
            >
              응원 메시지 폼
            </Link>{" "}
            을 통해 알려주세요.
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
