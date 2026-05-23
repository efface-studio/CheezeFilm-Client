import { V2Header, V2Footer } from "../page";
import { getContent, loadContentMap } from "@/lib/content";
import { InView } from "@/components/Stagger";
import V2SupportTabs from "./V2SupportTabs";

type SearchParams = Promise<{ tab?: string }>;

export const metadata = {
  title: "지원 · Apply",
  description:
    "치즈필름이 함께할 사람을 찾고 있습니다. 진행 중인 오디션 공고 확인, 팬레터 전달도 이곳에서.",
  alternates: { canonical: "/v2/support" },
  openGraph: {
    title: "지원 · Apply | 치즈필름",
    description: "오디션 공고 확인 · 응원 메시지 보내기.",
    url: "/v2/support",
    type: "website",
    images: ["/cheeze-logo.png"],
  },
  twitter: { images: ["/cheeze-logo.png"] },
};

export default async function V2SupportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initialTab = params.tab === "fan" ? "fan" : "audition";
  const contentMap = await loadContentMap();

  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial lg:pl-56">
      <V2Header />

      <section className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 grid lg:grid-cols-12 gap-x-10 gap-y-8 items-end">
          <InView className="v2-fade-up lg:col-span-2">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Take part</div>
            <div className="mt-2 text-[3rem] leading-none text-cheeze-purple" style={{ fontFamily: "var(--font-display)" }}>
              04
            </div>
          </InView>
          <InView className="v2-fade-up v2-title lg:col-span-7">
            <h1
              className="text-5xl md:text-7xl tracking-[-0.02em] leading-[0.95]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {getContent(contentMap, "support.title")}
            </h1>
            <p className="mt-5 text-cheeze-ink-soft max-w-xl whitespace-pre-line">
              {getContent(contentMap, "support.subtitle")}
            </p>
          </InView>
          <InView className="v2-fade-up lg:col-span-3 lg:text-right text-[11px] tracking-widest uppercase text-cheeze-olive leading-relaxed">
            보내주신 모든 응답은 제작팀이 직접 읽습니다.
            <br />
            문의 · cheezefilm.m@gmail.com
          </InView>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <V2SupportTabs initialTab={initialTab} />
      </section>

      <V2Footer />
    </main>
  );
}
