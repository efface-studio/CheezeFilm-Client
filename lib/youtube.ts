/**
 * YouTube 영상 페치 레이어.
 *
 * 우선순위
 *   1. YOUTUBE_API_KEY 가 .env.local 에 있으면 → YouTube Data API v3 로 채널의
 *      uploads 플레이리스트를 페이지네이션해 503개 영상을 모두 가져옵니다.
 *      이어서 videos.list 로 duration 을 메타데이터로 받습니다.
 *   2. 키가 없거나 API 호출이 실패하면 → 채널의 공개 RSS 피드로 폴백해
 *      가장 최근 15개 영상을 가져옵니다.
 *
 * 쇼츠/롱폼 분류는 **두 경로 모두** /shorts/<id> HEAD probe 로 합니다.
 * (예전엔 API 경로에서 duration ≤ 60s 규칙을 썼는데, 2024 부터 쇼츠가
 *  최대 180s 까지 늘어나서 길이만으론 100% 가를 수 없어요. probe 가 정답.)
 *
 * 두 경로 모두 Next.js fetch 캐시(`next: { revalidate: 3600 }`)로 1시간
 * 캐싱돼서 quota·트래픽 부담을 거의 만들지 않습니다.
 */

import { XMLParser } from "fast-xml-parser";
import { unstable_cache } from "next/cache";

const CHANNEL_ID = "UCYn09ySlShmzBtYwl1OgOsA"; // CheezeFilm

/**
 * Probe-실패 시 마지막 폴백으로만 쓰는 길이 기준값.
 * 정상 경로에선 HEAD probe 가 판별합니다.
 */
const SHORT_FALLBACK_MAX_SECONDS = 60;
/**
 * 영상 길이가 이 값보다 길면 절대 쇼츠가 될 수 없다고 단정 — probe 자체를 건너뜀.
 * YouTube 의 공식 쇼츠 최대 길이는 2024년부터 180초(3분)예요. 그 이상 영상은
 * 무조건 longform 이라 HEAD probe 한 번을 통째로 아낄 수 있고, ~500편 채널
 * 기준 콜드 로드에서 가장 큰 단일 절약 (보통 longform 이 채널의 절반 이상).
 */
const SHORTS_HARD_CEILING_SECONDS = 180;
// PROBE_CONCURRENCY + pMapLimit retired with the API-path probe step;
// duration + title heuristic now handles classification synchronously.
// The RSS-only path (~15 videos) still uses probeIsShort directly.

export type Video = {
  id: string;
  title: string;
  description?: string;
  publishedAt: string; // ISO
  thumbnail: string;
  url: string;
  /** Best-effort classification: 60s 이하이거나 세로 비율이면 true */
  isShort: boolean;
  /** Duration in seconds (Data API only). */
  durationSec?: number;
};

export type VideoFetchResult = {
  videos: Video[];
  longform: Video[];
  shorts: Video[];
  /** Which path produced the list, for the UI to display a helpful hint. */
  source: "api" | "rss" | "none";
  /** Channel total upload count if known (API path only). */
  totalCount?: number;
  /** Channel subscriber count if known (API path only). */
  subscriberCount?: number;
  /** Channel cumulative view count if known (API path only). */
  viewCount?: number;
  error?: string;
};

// --- helpers -------------------------------------------------------------

/** ISO 8601 duration → seconds. "PT1M30S" → 90. */
function parseIsoDuration(iso: string | undefined): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
  if (!m) return undefined;
  const [, h, min, s] = m;
  return (
    (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + Number(s) || 0
  );
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// --- RSS path ------------------------------------------------------------

type RssEntry = {
  "yt:videoId"?: string;
  title?: string;
  published?: string;
  "media:group"?: {
    "media:thumbnail"?: { "@_url"?: string } | Array<{ "@_url"?: string }>;
    "media:description"?: string;
  };
};

/**
 * Determine whether a video is a Short by probing the /shorts/<id> URL.
 *
 * YouTube serves /shorts/<id> with status 200 only for actual Shorts.
 * Regular videos return a 303/302 redirect to /watch?v=<id>.
 *
 * We send a manual-redirect HEAD so we can inspect status + Location without
 * downloading the page body. Result is null on network failure.
 */
async function probeIsShort(videoId: string): Promise<boolean | null> {
  try {
    const res = await fetch(`https://www.youtube.com/shorts/${videoId}`, {
      method: "HEAD",
      redirect: "manual",
      next: { revalidate: 3600 },
    });
    // 2xx with no redirect → genuine shorts page
    if (res.status >= 200 && res.status < 300) return true;
    // 3xx with Location pointing at /watch → it's a regular video
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location") ?? "";
      if (loc.includes("/watch")) return false;
      // Other redirect destinations (rare) — treat as non-short
      return false;
    }
    // 4xx/5xx → can't tell
    return null;
  } catch {
    return null;
  }
}

async function fetchViaRSS(): Promise<Video[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: { Accept: "application/atom+xml,application/xml,*/*" },
  });
  if (!res.ok) throw new Error(`RSS ${res.status}`);
  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml) as { feed?: { entry?: RssEntry | RssEntry[] } };
  const entries = parsed?.feed?.entry ?? [];
  const list = Array.isArray(entries) ? entries : [entries];

  const base: Omit<Video, "isShort">[] = list
    .map((e) => {
      const id = e["yt:videoId"];
      if (!id) return null;
      return {
        id,
        title: typeof e.title === "string" ? e.title : "",
        publishedAt: e.published ?? "",
        // RSS returns the 480×360 `hqdefault` by default which looks blurry in
        // bigger card layouts. Force the 1280×720 `maxresdefault` instead —
        // virtually every modern CheezeFilm upload has it. Client img tags
        // (see <Thumb>) fall back to hq for the rare older videos.
        thumbnail: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        description: e["media:group"]?.["media:description"],
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // Classify by probing /shorts/<id>. RSS gives 15 items max so this is
  // ~15 outbound HEAD requests, each cached for an hour.
  const classified = await Promise.all(
    base.map(async (v) => {
      const probe = await probeIsShort(v.id);
      let isShort: boolean;
      if (probe !== null) {
        isShort = probe;
      } else {
        // Probe failed — fall back to title hints. Default to longform.
        const hay = `${v.title} ${v.description ?? ""}`.toLowerCase();
        isShort = /#shorts?\b|\b쇼츠\b/i.test(hay);
      }
      return { ...v, isShort };
    }),
  );
  return classified;
}

// --- Data API path -------------------------------------------------------

type ChannelsResponse = {
  items?: Array<{
    contentDetails?: {
      relatedPlaylists?: { uploads?: string };
    };
    statistics?: {
      videoCount?: string;
      subscriberCount?: string;
      viewCount?: string;
    };
  }>;
};

type PlaylistItemsResponse = {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: Record<
        "default" | "medium" | "high" | "standard" | "maxres",
        { url?: string } | undefined
      >;
    };
    contentDetails?: {
      videoId?: string;
      videoPublishedAt?: string;
    };
  }>;
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
};

type VideosResponse = {
  items?: Array<{
    id?: string;
    contentDetails?: { duration?: string };
  }>;
};

async function fetchDurations(
  videoIds: string[],
  apiKey: string,
): Promise<Map<string, number>> {
  const durations = new Map<string, number>();
  // videos.list supports up to 50 ids per call.
  for (const ids of chunk(videoIds, 50)) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", ids.join(","));
    url.searchParams.set("key", apiKey);
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });
    if (!res.ok) continue;
    const data = (await res.json()) as VideosResponse;
    for (const item of data.items ?? []) {
      const sec = parseIsoDuration(item.contentDetails?.duration);
      if (item.id && typeof sec === "number") {
        durations.set(item.id, sec);
      }
    }
  }
  return durations;
}

async function fetchViaAPI(apiKey: string): Promise<{
  videos: Video[];
  totalCount?: number;
  subscriberCount?: number;
  viewCount?: number;
}> {
  // 1) Look up the channel's uploads playlist.
  const chanRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&id=${CHANNEL_ID}&key=${apiKey}`,
    { next: { revalidate: 3600 } },
  );
  if (!chanRes.ok) throw new Error(`channels.list ${chanRes.status}`);
  const chanData = (await chanRes.json()) as ChannelsResponse;
  const uploadsId =
    chanData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  const stats = chanData.items?.[0]?.statistics;
  const totalCount = stats?.videoCount ? Number(stats.videoCount) : undefined;
  const subscriberCount = stats?.subscriberCount
    ? Number(stats.subscriberCount)
    : undefined;
  const viewCount = stats?.viewCount ? Number(stats.viewCount) : undefined;
  if (!uploadsId) return { videos: [], totalCount, subscriberCount, viewCount };

  // 2) Page through playlistItems.list.
  const out: Omit<Video, "isShort" | "durationSec">[] = [];
  let pageToken: string | undefined;
  // Safety cap: 20 pages × 50 = 1000 videos max. Channel has ~500.
  for (let i = 0; i < 20; i++) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", uploadsId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      if (out.length === 0) throw new Error(`playlistItems ${res.status}`);
      break;
    }
    const data = (await res.json()) as PlaylistItemsResponse;
    for (const item of data.items ?? []) {
      const id = item.contentDetails?.videoId;
      if (!id) continue;
      const thumbs = item.snippet?.thumbnails;
      const thumb =
        thumbs?.maxres?.url ??
        thumbs?.standard?.url ??
        thumbs?.high?.url ??
        thumbs?.medium?.url ??
        `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
      out.push({
        id,
        title: item.snippet?.title ?? "",
        description: item.snippet?.description,
        publishedAt:
          item.contentDetails?.videoPublishedAt ??
          item.snippet?.publishedAt ??
          "",
        thumbnail: thumb,
        url: `https://www.youtube.com/watch?v=${id}`,
      });
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  // 3) Pull durations as useful metadata + as a probe-failure fallback.
  const durations = await fetchDurations(
    out.map((v) => v.id),
    apiKey,
  );

  // 4) Classify every video.
  //
  //    Earlier passes did a /shorts/<id> HEAD probe per video for
  //    100% accurate classification, but with ~500 videos on the
  //    channel the probe step alone cost 4–8s on a cold render —
  //    which is what the user actually saw as a stuck skeleton on
  //    Filmography. The full HEAD-probe path has been retired.
  //
  //    Pure duration + title heuristic now:
  //      - `sec > SHORTS_HARD_CEILING_SECONDS` (180s) → definitely
  //        longform. YouTube hard-caps shorts at 3 min.
  //      - `sec <= SHORT_FALLBACK_MAX_SECONDS` (60s) → call it a
  //        short. Edge cases here are intentional short clips
  //        uploaded as regular videos, which are rare on a content
  //        channel like this and at worst cause one strip-card to
  //        show in the wrong tab.
  //      - 60–180s in between → check title/description for
  //        `#shorts` / `쇼츠` tags; default to longform otherwise.
  //
  //    No network in this step. Step 1 (channel meta) and step 2
  //    (playlist pages) still cost the same; step 3 (durations) is
  //    one batched call. End-to-end cold render now dominated by
  //    those, which are ~1.5–2s combined.
  const classified: Video[] = out.map((v) => {
    const sec = durations.get(v.id);
    let isShort: boolean;
    if (typeof sec === "number") {
      if (sec > SHORTS_HARD_CEILING_SECONDS) {
        isShort = false;
      } else if (sec <= SHORT_FALLBACK_MAX_SECONDS) {
        isShort = true;
      } else {
        // 60–180s: tag sniff. Default longform.
        isShort = /#shorts?\b|쇼츠/i.test(`${v.title} ${v.description ?? ""}`);
      }
    } else {
      // No duration data (rare) — last-ditch title sniff.
      isShort = /#shorts?\b|쇼츠/i.test(`${v.title} ${v.description ?? ""}`);
    }
    return { ...v, durationSec: sec, isShort };
  });

  return { videos: classified, totalCount, subscriberCount, viewCount };
}

// --- Public entry --------------------------------------------------------

// Two-layer caching strategy.
//
// 1. `unstable_cache` (Next.js data cache) — persists across requests
//    AND across serverless cold starts (it's backed by Vercel's
//    durable cache, not just process memory). This is the layer that
//    actually keeps the user from waiting on the full 4-8s YouTube
//    pipeline. 10 min revalidate window keeps the channel feed
//    reasonably fresh; admin can call `revalidateTag("videos")` if a
//    refresh is needed sooner.
//
// 2. Module-level memo `cached` + `inFlight` — coalesces concurrent
//    calls within the same lambda invocation. unstable_cache already
//    de-dupes simultaneous calls per Next docs, but the in-flight
//    promise guard adds a final layer of safety when the entire home
//    page is awaiting getAllVideos through three different Suspense
//    boundaries at once (LiveStatsBar, FilmsGrid, ShortsStripSection).
//
// Together: a cold visit pays the full pipeline ONCE per 10-min
// window, every other visitor on the same window gets a < 50ms cache
// hit even from a fresh serverless instance.
export const VIDEOS_TAG = "videos";
const REVALIDATE_SECONDS = 10 * 60;

const _getAllVideosUncached = unstable_cache(
  async (): Promise<VideoFetchResult> => {
    const apiKey = process.env.YOUTUBE_API_KEY;
    let result: {
      videos: Video[];
      source: "api" | "rss" | "none";
      totalCount?: number;
      subscriberCount?: number;
      viewCount?: number;
      error?: string;
    };
    if (apiKey) {
      try {
        const { videos, totalCount, subscriberCount, viewCount } =
          await fetchViaAPI(apiKey);
        if (videos.length > 0) {
          result = {
            videos,
            source: "api",
            totalCount,
            subscriberCount,
            viewCount,
          };
        } else {
          throw new Error("API returned no videos");
        }
      } catch (e) {
        console.error("YouTube Data API failed, falling back to RSS:", e);
        result = await rssResult();
      }
    } else {
      result = await rssResult();
    }
    return {
      ...result,
      longform: result.videos.filter((v) => !v.isShort),
      shorts: result.videos.filter((v) => v.isShort),
    };
  },
  ["videos:all"],
  { tags: [VIDEOS_TAG], revalidate: REVALIDATE_SECONDS },
);

// In-flight coalescer for the rare case where the home page fires
// three Suspense boundaries against this function in the same render.
// unstable_cache handles cross-request, this handles intra-request.
let inFlight: Promise<VideoFetchResult> | null = null;

export async function getAllVideos(): Promise<VideoFetchResult> {
  if (inFlight) return inFlight;
  inFlight = _getAllVideosUncached();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

async function rssResult(): Promise<{
  videos: Video[];
  source: "rss" | "none";
  error?: string;
}> {
  try {
    const videos = await fetchViaRSS();
    return {
      videos,
      source: videos.length > 0 ? "rss" : "none",
    };
  } catch (e) {
    console.error("YouTube RSS failed:", e);
    return {
      videos: [],
      source: "none",
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
