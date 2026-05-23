import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SupportTabs from "./SupportTabs";
import { getContent, loadContentMap } from "@/lib/content";

type SearchParams = Promise<{ tab?: string }>;

export const dynamic = "force-dynamic";

export const metadata = {
  title: "지원하기 | 치즈필름",
  description: "치즈필름 오디션 지원과 팬 응원 메시지를 받는 곳.",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const initialTab = params.tab === "fan" ? "fan" : "audition";
  const contentMap = await loadContentMap();
  const c = (key: string) => getContent(contentMap, key);

  return (
    <>
      <SiteHeader />

      <section className="relative border-b-2 border-cheeze-ink">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(85,34,163,0.35) 0%, rgba(250,190,75,0.15) 60%, transparent 90%)",
          }}
        />
        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          <span className="tape text-xs">{c("support.tape")}</span>
          <h1
            className="mt-6"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              lineHeight: "1",
            }}
          >
            {c("support.title")}
          </h1>
          <p className="mt-5 text-cheeze-ink-soft max-w-xl mx-auto leading-relaxed">
            {c("support.subtitle")}
          </p>
        </div>
      </section>

      <SupportTabs initialTab={initialTab} />

      <SiteFooter />
    </>
  );
}
