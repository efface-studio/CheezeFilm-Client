import { V2Header, V2Footer } from "../page";
import { getContent } from "@/lib/content";
import { InView } from "@/components/Stagger";
import V2SupportTabs from "./V2SupportTabs";

type SearchParams = Promise<{ tab?: string }>;

export const metadata = { title: "지원 | 치즈필름 02", description: "Audition & fan letter." };

export default async function V2SupportPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initialTab = params.tab === "fan" ? "fan" : "audition";

  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial">
      <V2Header />

      <section className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-7xl px-6 py-16 grid lg:grid-cols-12 gap-x-10 gap-y-8 items-end">
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
              {getContent("support.title")}
            </h1>
            <p className="mt-5 text-cheeze-ink-soft max-w-xl whitespace-pre-line">
              {getContent("support.subtitle")}
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
