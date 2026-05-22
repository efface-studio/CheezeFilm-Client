import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { getAllVideos } from "@/lib/youtube";
import VideoGrid from "./VideoGrid";

export const metadata = {
  title: "영상 | 치즈필름",
  description: "치즈필름 채널의 모든 영상을 한자리에. 검색해서 찾아보세요.",
};

// Cache for an hour. Channel posts at most a few times per week, so this is
// plenty fresh and keeps Data API quota near zero.
export const revalidate = 3600;

type SearchParams = Promise<{ kind?: string }>;

export default async function VideosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { videos, longform, shorts, source, totalCount, error } =
    await getAllVideos();
  const params = await searchParams;
  const initialKind: "longform" | "shorts" =
    params.kind === "shorts" ? "shorts" : "longform";

  return (
    <>
      <SiteHeader />

      {/* HERO */}
      <section className="relative border-b-2 border-cheeze-purple-deep">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(85,34,163,0.32) 0%, rgba(250,190,75,0.12) 60%, transparent 95%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
          <span className="tape text-xs">FILMOGRAPHY · ALL ROLLS</span>
          <h1
            className="mt-5 leading-[0.95] text-cheeze-ink"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2.4rem, 7vw, 5rem)",
            }}
          >
            치즈필름의 <br />
            <span className="text-cheeze-purple">모든 컷.</span>
          </h1>

          <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2 text-sm text-cheeze-ink-soft">
            <span>
              롱폼{" "}
              <span
                className="text-2xl text-cheeze-purple align-baseline"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {longform.length.toLocaleString()}
              </span>
              편
              <span className="mx-2 text-cheeze-olive">·</span>
              쇼츠{" "}
              <span
                className="text-2xl text-cheeze-purple align-baseline"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {shorts.length.toLocaleString()}
              </span>
              편
              {totalCount && totalCount > videos.length
                ? ` (채널 전체 ${totalCount.toLocaleString()}편)`
                : ""}
            </span>
            <SourceBadge source={source} videoCount={videos.length} />
          </div>

          {source === "rss" && (
            <details className="mt-6 max-w-2xl text-sm">
              <summary className="cursor-pointer text-cheeze-purple font-bold underline-offset-4 hover:underline">
                ▶ 더 많은 영상(전체 503편+)을 보고 싶다면?
              </summary>
              <div className="mt-3 p-4 border-2 border-cheeze-purple-deep bg-cheeze-cream-deep/40 leading-relaxed">
                <p className="mb-2">
                  현재 YouTube 공개 RSS로 <b>최근 15편</b>만 가져오고 있어요.
                  채널의 모든 영상을 띄우려면 무료 YouTube Data API 키가
                  필요합니다.
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-cheeze-ink-soft">
                  <li>
                    <a
                      href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-cheeze-purple"
                    >
                      Google Cloud Console
                    </a>{" "}
                    에서 프로젝트 생성 → YouTube Data API v3 사용 설정
                  </li>
                  <li>API 키 발급 (좌측 메뉴 → 사용자 인증 정보)</li>
                  <li>
                    프로젝트 루트의{" "}
                    <code className="bg-cheeze-cream-deep px-1">
                      .env.local
                    </code>{" "}
                    파일에 추가:
                    <pre className="mt-2 bg-cheeze-charcoal text-cheeze-yellow p-3 text-xs overflow-x-auto">
                      YOUTUBE_API_KEY=AIzaSyA-여기에-키-붙여넣기
                    </pre>
                  </li>
                  <li>dev 서버 재시작 → 503편 전체 자동 노출</li>
                </ol>
                <p className="mt-3 text-xs text-cheeze-olive">
                  하루 무료 quota는 10,000 단위, 이 페이지 한 번 로드에 약 12
                  단위만 씁니다. 사실상 무료.
                </p>
              </div>
            </details>
          )}

          {source === "none" && (
            <div className="mt-6 border-2 border-cheeze-wine bg-cheeze-wine/10 p-4 text-sm text-cheeze-wine">
              ⚠ 영상을 불러오지 못했어요. 잠시 뒤 새로고침하거나, 인터넷 연결을
              확인해주세요.
              {error && (
                <div className="mt-1 text-xs opacity-70">상세: {error}</div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12">
        <VideoGrid
          longform={longform}
          shorts={shorts}
          initialKind={initialKind}
        />
      </section>

      <SiteFooter />
    </>
  );
}

function SourceBadge({
  source,
  videoCount,
}: {
  source: "api" | "rss" | "none";
  videoCount: number;
}) {
  if (source === "api") {
    return (
      <span className="stamp text-cheeze-purple text-[10px]">
        Data API · 전체 채널
      </span>
    );
  }
  if (source === "rss" && videoCount > 0) {
    return (
      <span className="stamp text-cheeze-olive text-[10px]">
        RSS · 최근 15편
      </span>
    );
  }
  return null;
}
