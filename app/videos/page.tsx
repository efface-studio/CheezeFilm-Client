import Link from "next/link";
import { getAllVideos } from "@/lib/youtube";
import { SiteHeader, SiteFooter } from "../page";
import { InView } from "@/components/Stagger";
import VideosGrid from "./VideosGrid";

export const revalidate = 3600;
export const metadata = {
  title: "필모 · Filmography",
  description:
    "치즈필름이 지금까지 구워낸 작품들. 롱폼·쇼츠를 한 자리에서 다시 보세요.",
  alternates: { canonical: "/videos" },
  openGraph: {
    title: "필모 · Filmography | 치즈필름",
    description: "치즈필름의 롱폼·쇼츠 필모그래피.",
    url: "/videos",
    type: "website",
    images: ["/cheeze-logo.png"],
  },
  twitter: { images: ["/cheeze-logo.png"] },
};

type SearchParams = Promise<{ kind?: string }>;

export default async function VideosPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const initialKind: "longform" | "shorts" =
    params.kind === "shorts" ? "shorts" : "longform";
  const { longform, shorts, source, totalCount } = await getAllVideos();

  return (
    <main className="min-h-screen bg-cheeze-cream text-cheeze-ink editorial flex flex-col">
      <SiteHeader />

      <section className="border-b border-cheeze-purple-deep/15">
        <div className="mx-auto max-w-[100rem] px-6 py-16 grid lg:grid-cols-12 gap-x-10 gap-y-8 items-end">
          <InView className="fade-up lg:col-span-2">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-olive">— Filmography</div>
            <div className="mt-2 text-[3rem] leading-none text-cheeze-purple" style={{ fontFamily: "var(--font-display)" }}>
              02
            </div>
          </InView>
          <InView className="fade-up display-title lg:col-span-7">
            <h1
              className="text-5xl md:text-7xl tracking-[-0.02em] leading-[0.95]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              All Films.
            </h1>
            <p className="mt-5 text-cheeze-ink-soft max-w-xl">
              매주 굽고 있는 모든 한 컷. 검색해서 찾아보세요.
            </p>
          </InView>
          <InView className="fade-up lg:col-span-3 lg:text-right">
            <div className="flex flex-col lg:items-end gap-1 text-sm">
              <span>
                <span
                  className="text-cheeze-purple text-3xl tabular-nums"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {longform.length}
                </span>{" "}
                <span className="text-cheeze-olive text-xs uppercase tracking-widest">롱폼</span>
              </span>
              <span>
                <span
                  className="text-cheeze-purple text-3xl tabular-nums"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {shorts.length}
                </span>{" "}
                <span className="text-cheeze-olive text-xs uppercase tracking-widest">쇼츠</span>
              </span>
              {totalCount && totalCount > longform.length + shorts.length && (
                <span className="text-[11px] text-cheeze-olive tracking-widest uppercase">
                  Channel · {totalCount} total
                </span>
              )}
              {source === "rss" && (
                <span className="text-[10px] text-cheeze-olive">RSS · 최근 15편</span>
              )}
            </div>
          </InView>
        </div>
      </section>

      {/* w-full is critical here. In a `flex flex-col` parent, an
          `mx-auto` child gets `margin-left: auto; margin-right: auto`
          which in flex cross-axis takes priority over `align-items:
          stretch` — collapsing the section to its widest child's
          intrinsic width. For shorts (9:16 cards with no natural
          width via Next/Image fill), that collapse produced a narrow
          shifted grid. Explicit `w-full` overrides the auto-shrink. */}
      <section className="w-full max-w-[100rem] mx-auto px-6 py-14">
        <VideosGrid longform={longform} shorts={shorts} initialKind={initialKind} />
      </section>

      {source === "rss" && (
        <section className="border-t border-cheeze-purple-deep/15 bg-cheeze-cream-deep/40">
          <div className="mx-auto max-w-[100rem] px-6 py-10 text-sm text-cheeze-ink-soft leading-relaxed">
            <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-purple mb-2">
              — Editor's note
            </div>
            <p>
              지금은 YouTube RSS로 최신 15편만 가져오고 있어요. 전체 503편을 띄우려면
              관리자 → 사이트 설정에서 YouTube Data API 키를 입력하세요.
            </p>
            <Link
              href="/admin"
              className="mt-3 inline-block text-cheeze-purple font-bold tracking-widest uppercase text-xs hover:text-cheeze-purple-deep"
            >
              관리자로 →
            </Link>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
