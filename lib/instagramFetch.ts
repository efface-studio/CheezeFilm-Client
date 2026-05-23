/**
 * 인스타그램 공개 프로필 사진을 best-effort 로 가져옵니다.
 *
 * Instagram 은 인증 없는 스크래핑을 적극 차단합니다 — IP·시간대·헤더에
 * 따라 200/401/429/HTML 로그인 페이지 등 결과가 들쭉날쭉할 수 있습니다.
 * 그래서 이 모듈은 "되면 좋고, 안 되면 null" 정신으로 동작합니다.
 *
 * 시도 순서:
 *   1. `/api/v1/users/web_profile_info/?username=<handle>` (JSON)
 *      — 가장 깔끔. `X-IG-App-ID` 헤더 필요. 종종 막힘.
 *   2. `https://www.instagram.com/<handle>/` (HTML)
 *      — og:image 메타 태그에서 프로필 URL 추출. 폴백.
 *
 * 가져온 이미지 URL 은 인스타 CDN(scontent.cdninstagram.com)에서 즉시
 * 다운받아 바이트로 반환합니다 (URL 자체는 단명 토큰이 붙음).
 */

export type ProfilePic = { buffer: Buffer; ext: "jpg" | "png" | "webp" };

/**
 * iPhone Safari UA. 이게 핵심 트릭 — Instagram 은 desktop UA 에는 빈
 * React shell 만 던지지만, 모바일 Safari UA 에는 SSR HTML 안에 `og:image`
 * 메타 태그(프로필 사진 CDN URL)를 그대로 내려줍니다. 데스크탑 UA 로는
 * 같은 페이지가 og:image 없이 옴.
 */
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
  "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 " +
  "Mobile/15E148 Safari/604.1";

/** 이미지 다운로드 시에는 좀 더 일반적인 UA — CDN 은 iPhone UA 도 받지만
 *  특정 조합에 따라 차단당하는 케이스가 있어서 분리. */
const IMG_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

/**
 * 너무 작으면 placeholder/에러 stub — 거절.
 *
 * 2024+ Instagram 은 무인증 og:image 로 100×100 만 내려보냅니다 (≈ 2KB).
 * 모든 더 큰 사이즈 변종은 CDN 서명 불일치로 403 — 우회 불가능.
 * 그래서 컷오프를 1.5KB 까지 낮춰서 그 작은 아바타라도 받아옵니다.
 * 멤버 행의 48×48 원형 썸네일에선 충분히 깔끔, 200×250 편집 카드에선
 * 살짝 흐리지만 인스타 본인 사진이라는 정합성은 유지.
 */
const MIN_ACCEPTABLE_BYTES = 1_500;
/** 30KB 이상이면 HD (보통 1080×1080 게시물 이미지) 로 간주, 더 시도 안 함. */
const HD_BYTES_THRESHOLD = 30_000;

function extFromContentType(ct: string | null): ProfilePic["ext"] {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  return "jpg";
}

async function downloadImage(url: string): Promise<ProfilePic | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": IMG_UA, Accept: "image/*" },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1024) return null; // sub-1KB → almost certainly an error stub
    return { buffer, ext: extFromContentType(res.headers.get("content-type")) };
  } catch {
    return null;
  }
}

/**
 * Instagram CDN URL 에서 사이즈를 더 크게 바꿔 HD 변종을 노립니다.
 *
 * 2024+ 들어 Instagram CDN URL 의 사이즈 토큰 위치가 두 가지로 갈렸음:
 *   · 구식: `…/sNNxNN/…/n.jpg` — path segment 안에 박혀있음
 *   · 신식: `…/n.jpg?stp=dst-jpg_sNNxNN_tt6&…` — query 의 `stp` 파라미터
 *
 * 더 큰 사진을 노리는 가장 확실한 방법은 **stp 자체를 통째로 제거**해서
 * CDN 이 원본 크기로 응답하게 만드는 것. 안 되면 더 큰 사이즈 토큰으로
 * 갈아끼우는 변종도 시도. 모든 변종 차례대로 → 가장 큰 파일 채택, 50KB
 * 넘으면 충분히 HD 로 보고 조기 종료.
 */
function urlSizeVariants(url: string): string[] {
  const candidates: string[] = [];

  // 1) `stp` 파라미터를 떼서 원본 사이즈 요청 (신식)
  try {
    const u = new URL(url);
    if (u.searchParams.has("stp")) {
      const noStp = new URL(url);
      noStp.searchParams.delete("stp");
      candidates.push(noStp.toString());
    }
  } catch {
    /* malformed URL — skip */
  }

  // 2) `stp` 안의 사이즈 토큰을 큰 값으로 갈아끼우기 (신식)
  if (/[?&]stp=[^&]*_s\d+x\d+/.test(url)) {
    for (const s of ["s1080x1080", "s640x640", "s480x480"]) {
      candidates.push(url.replace(/_s\d+x\d+/, `_${s}`));
    }
  }

  // 3) path 안의 `/sNNxNN/` 사이즈 토큰 (구식)
  if (/\/s\d+x\d+\//.test(url)) {
    for (const s of ["s1080x1080", "s640x640", "s480x480", "s320x320"]) {
      candidates.push(url.replace(/\/s\d+x\d+\//, `/${s}/`));
    }
  }

  // 4) 마지막으로 원본 URL 그대로 (백스톱)
  candidates.push(url);

  // De-dup while preserving order.
  return Array.from(new Set(candidates));
}

async function downloadHighestQuality(url: string): Promise<ProfilePic | null> {
  let best: ProfilePic | null = null;
  for (const v of urlSizeVariants(url)) {
    const pic = await downloadImage(v);
    if (!pic) continue;
    if (pic.buffer.length < MIN_ACCEPTABLE_BYTES) continue;
    if (!best || pic.buffer.length > best.buffer.length) {
      best = pic;
      if (pic.buffer.length >= HD_BYTES_THRESHOLD) break;
    }
  }
  return best;
}

async function viaWebProfileInfo(handle: string): Promise<string | null> {
  const url = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "X-IG-App-ID": "936619743392459",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        Referer: `https://www.instagram.com/${handle}/`,
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: {
        user?: {
          profile_pic_url_hd?: string;
          profile_pic_url?: string;
        };
      };
    };
    return (
      json?.data?.user?.profile_pic_url_hd ??
      json?.data?.user?.profile_pic_url ??
      null
    );
  } catch {
    return null;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x3A;/gi, ":");
}

/** og:image 메타 태그 (모바일 UA 한정) — 보통 s100x100 작은 아바타. */
async function viaOgImage(handle: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(
      /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    );
    if (!m) return null;
    return decodeHtmlEntities(m[1]);
  } catch {
    return null;
  }
}

/**
 * `/<handle>/embed/` 페이지 파싱 — 여기엔 더 큰 해상도 URL 들이 박혀있음.
 *
 *   · `t51.82787-19/...` 경로 = 프로필 사진. embed 에선 s150x150 까지 옴
 *     (메인 og:image 의 s100x100 보다 50% 큼).
 *   · `t51.82787-15/...` 경로 = 일반 게시물 이미지. p1080x1080 같은 HD
 *     사이즈로 박혀있어서 사용자 카드 200×250 에 띄워도 충분히 선명.
 *
 * 반환 순서: HD 게시물 → s150 프로필 → og:image (백스톱).
 * 사용자가 "프로필이나 게시물에서" 라고 명시했으므로 게시물 HD 우선이 OK.
 */
/**
 * Instagram embed 페이지는 JSON 데이터를 JS 문자열 리터럴 안에 다시
 * 박아둬서 결과적으로 **이중으로 escape** 된 형태로 옴:
 *
 *   <script>… = "{\"display_url\":\"https:\\/\\/scontent…\\\"}";</script>
 *
 * 두 단계로 풀어야 진짜 URL 이 나옴 — outer 한 번, inner 한 번.
 * 첫 단계는 outer JSON-stringified 문자열을 푸는 거고, 두 번째 단계는
 * 그 안에 들어있던 JSON 객체 안의 URL escape (`\/`) 를 푸는 것.
 */
function extractDoubleEscapedJsonValue(
  html: string,
  key: string,
): string[] {
  const out: string[] = [];
  // 이중 escape 패턴: `\"key\":\"VALUE\"` (VALUE 안엔 `\"` 는 없다고 가정)
  const re = new RegExp(`\\\\"${key}\\\\":\\\\"(.*?)\\\\"`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1];
    // Outer escape 풀기: `\\\\` → `\\`, `\\"` → `"` 같은 류는 URL 엔 거의
    // 없지만 일단 정리. 그 다음 inner escape `\\/` → `/`, `\\u0026` → `&`.
    const url = raw
      .replace(/\\\\\//g, "/") // \\/  → /  (이중 escape 풀기)
      .replace(/\\\\u0026/gi, "&")
      .replace(/\\\//g, "/") // 혹시 한 단계로 인코딩된 경우
      .replace(/\\u0026/gi, "&");
    out.push(url);
  }
  return out;
}

async function viaEmbed(handle: string): Promise<string[]> {
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/embed/`, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const urls: string[] = [];

    // 우선순위 1: `profile_pic_url` — 정의상 본인 얼굴 사진. embed 에선
    //   s150 사이즈로 옵니다 (정사각 작은 아바타). 멤버 카드에서 얼굴 보장.
    urls.push(...extractDoubleEscapedJsonValue(html, "profile_pic_url"));
    // 우선순위 2: `display_url` — 최신 게시물 이미지. 1080×1080 HD 라
    //   화질은 좋지만 내용이 본인 얼굴이 아닐 수 있음(작품 스틸·홍보 이미지
    //   등). profile_pic 이 너무 작거나 받아지지 않을 때만 사용.
    urls.push(...extractDoubleEscapedJsonValue(html, "display_url"));

    return urls.map(decodeHtmlEntities);
  } catch {
    return [];
  }
}

/**
 * 후보 URL 을 여러 경로에서 모아 가장 큰 파일을 채택합니다.
 *
 *   순서:
 *     1) embed 페이지 — 1080×1080 HD 게시물 이미지 + s150 프로필 (있을 때).
 *     2) web_profile_info JSON — 보통 401 인데 가끔 통함.
 *     3) og:image 메타 — 100×100 백스톱.
 *
 * 1.5KB 미만은 거절 (placeholder/에러 stub). 한 후보가 HD 사이즈를 넘기면
 * 더 시도하지 않고 조기 종료.
 */
export async function fetchInstagramProfilePic(
  handle: string,
): Promise<ProfilePic | null> {
  const clean = handle.trim().replace(/^@/, "");
  if (!clean) return null;

  const candidates: string[] = [];

  const embedUrls = await viaEmbed(clean);
  candidates.push(...embedUrls);

  const url1 = await viaWebProfileInfo(clean);
  if (url1 && !candidates.includes(url1)) candidates.push(url1);

  const url2 = await viaOgImage(clean);
  if (url2 && !candidates.includes(url2)) candidates.push(url2);

  let best: ProfilePic | null = null;
  for (const cand of candidates) {
    const pic = await downloadHighestQuality(cand);
    if (!pic) continue;
    if (!best || pic.buffer.length > best.buffer.length) best = pic;
    if (pic.buffer.length >= HD_BYTES_THRESHOLD) break;
  }
  return best;
}
