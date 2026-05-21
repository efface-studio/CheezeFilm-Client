/**
 * 치즈필름 멤버 데이터.
 *
 * 모든 정보는 위키백과 / 위키트리 인터뷰 / 공식 인스타그램에서 교차 확인했으며,
 * 확실하지 않은 항목은 `uncertain: true` 로 표시합니다.
 *
 * 사진은 SNS 핫링크가 금지돼 있어 직접 끌어올 수 없습니다. 대신:
 *   - public/members/<slug>.jpg 파일이 있으면 자동으로 사용하고,
 *   - 없으면 멤버 카드별 색상 + 이니셜로 구성된 폴라로이드 풀백을 보여줍니다.
 */

export type MemberRole = "lead" | "actor" | "writer" | "director";

export type Member = {
  slug: string;
  name: string;
  nameEn: string;
  role: MemberRole;
  roleLabel: string;
  highlight: string; // a short hook shown big
  bio: string;
  works: string[];
  joinedNote?: string;
  instagram?: string;
  sourceUrl?: string;
  /** Accent color used as the polaroid backdrop when no photo is provided. */
  accent: "purple" | "yellow" | "wine" | "charcoal" | "olive" | "cream";
  uncertain?: boolean;
};

export const members: Member[] = [
  {
    slug: "kim-eunha",
    name: "김은하",
    nameEn: "Kim Eun-ha",
    role: "director",
    roleLabel: "대표 · CEO",
    highlight: "스튜디오 치즈를 키운 사람",
    bio: "치즈필름 채널 전반과 (주)스튜디오 치즈 운영을 총괄. 300만+ 구독 웹드라마 채널의 방향성을 잡는 키플레이어입니다.",
    works: ["치즈필름 채널 전반", "다중인격 소녀", "남자무리 여사친"],
    joinedNote: "현 대표",
    instagram: "cheezefilm.ceo",
    sourceUrl: "https://ko.wikipedia.org/wiki/%EC%B9%98%EC%A6%88%ED%95%84%EB%A6%84",
    accent: "purple",
  },
  {
    slug: "eunseong",
    name: "은성",
    nameEn: "Eun-sung",
    role: "writer",
    roleLabel: "작가 · 총괄",
    highlight: "톤앤매너를 정립한 작가",
    bio: "동아리에서 시작한 치즈필름을 정식 제작사로 키운 핵심 인물. 작가진 4명을 진두지휘하며 채널의 색을 만들었습니다.",
    works: ["치즈필름 단편 시리즈 기획·집필 총괄"],
    joinedNote: "2018.12 합류",
    sourceUrl: "https://www.wikitree.co.kr/articles/574343",
    accent: "charcoal",
  },
  {
    slug: "park-seoyoung",
    name: "박서영",
    nameEn: "Park Seo-young",
    role: "lead",
    roleLabel: "배우 · 간판",
    highlight: "치즈필름 다작여왕",
    bio: "2018년 필름메이커스 오디션으로 합류해 시원시원하고 털털한 캐릭터로 채널 초창기부터 자리잡은 간판 배우.",
    works: ["달빛여고 MYC단", "학생 연애 — 여사친이 여자로 보일 때", "베이스먼트"],
    joinedNote: "2018 합류",
    sourceUrl: "https://www.wikitree.co.kr/articles/575915",
    accent: "wine",
  },
  {
    slug: "park-seyoung",
    name: "박세영",
    nameEn: "Park Se-young",
    role: "actor",
    roleLabel: "배우 · 모델",
    highlight: "모델 출신 멀티 플레이어",
    bio: "서울패션위크 촬영 중 조연출에게 스카우트되어 합류. 한 분야에 갇히지 않고 모델·배우 양쪽에서 활동합니다.",
    works: ["여동생이 오빠 연애를 코치한다", "웰컴 투 하와이"],
    joinedNote: "2019 합류",
    instagram: "syeeep_",
    sourceUrl: "https://www.wikitree.co.kr/articles/578212",
    accent: "olive",
  },
  {
    slug: "choi-eunji",
    name: "최은지",
    nameEn: "Choi Eun-ji",
    role: "lead",
    roleLabel: "배우",
    highlight: "회사원에서 늦깎이 배우로",
    bio: "건축회사 4년차 도면 작업자에서 2019년 오디션을 통해 배우로 전향. 유튜브 채널 '좋은지'도 운영합니다.",
    works: ["다중인격 소녀 — 아영", "나를 따라다니는 친구 특징", "여우로 오해 받는 친구 특징"],
    joinedNote: "2019.05 데뷔",
    instagram: "c_ej9236",
    sourceUrl: "https://www.wikitree.co.kr/articles/521926",
    accent: "purple",
  },
  {
    slug: "kim-gihae",
    name: "김기해",
    nameEn: "Kim Gi-hae",
    role: "actor",
    roleLabel: "배우",
    highlight: "본인만 모르는 잘생김",
    bio: "경희대 연극영화과 재학 중 합류. 큰 키에 잘생긴 외모인데 정작 본인은 모르는 캐릭터로 주목받았습니다.",
    works: ["남자무리 여사친", "달고나 — 진혁", "홍디션"],
    joinedNote: "2020.03 합류",
    sourceUrl: "https://www.wikitree.co.kr/articles/571590",
    accent: "charcoal",
  },
  {
    slug: "jo-chaeyun",
    name: "조채윤",
    nameEn: "Jo Chae-yun",
    role: "lead",
    roleLabel: "배우",
    highlight: "사투리·다인격 연기로 팬덤 형성",
    bio: "초기 활동명 '조아영'. 《다중인격 소녀》에서 사투리와 4가지 인격 변신 연기로 채널 팬덤을 만든 시리즈 주연.",
    works: ["다중인격 소녀 (시리즈 주연)"],
    joinedNote: "1999년생",
    instagram: "with_yun0515",
    accent: "wine",
    uncertain: true,
  },
  {
    slug: "jo-hyomin",
    name: "조효민",
    nameEn: "Jo Hyo-min",
    role: "actor",
    roleLabel: "배우 · 모델",
    highlight: "“치즈필름 효민”",
    bio: "단편선/공감 계열에 자주 출연하며 채널 내 인지도를 다진 배우. 외부 예능(꼰대희 ‘밥묵자’) 출연도 활발합니다.",
    works: ["치즈필름 단편선 다수", "꼰대희 — 밥묵자"],
    instagram: "hy0minim",
    accent: "olive",
  },
];

export function findMember(slug: string) {
  return members.find((m) => m.slug === slug);
}

export function getRoleColorClass(accent: Member["accent"]) {
  switch (accent) {
    case "purple":
      return "bg-cheeze-purple text-cheeze-yellow";
    case "yellow":
      return "bg-cheeze-yellow text-cheeze-purple-deep";
    case "wine":
      return "bg-cheeze-wine text-cheeze-cream";
    case "charcoal":
      return "bg-cheeze-charcoal text-cheeze-yellow";
    case "olive":
      return "bg-cheeze-olive text-cheeze-cream";
    case "cream":
      return "bg-cheeze-cream-deep text-cheeze-purple-deep";
  }
}
