/**
 * Korean → English romanization for member names.
 *
 * Resolution order when a member's `nameEn` field is empty in the DB:
 *
 *   1. `KNOWN_NAMES` — hand-curated map of cast members' English
 *      stage names (the value the channel actually uses publicly).
 *      Most accurate, but only covers names we've added by hand.
 *   2. `romanizeHangul(name)` — syllable-by-syllable Revised
 *      Romanization. Passable approximation for any Korean name
 *      we haven't curated yet (e.g. "박서영" → "Park Seo-yeong").
 *   3. The original Korean string — last-resort fallback.
 *
 * Caller is `resolveMemberNameEn(name, nameEn)` which gives EN-mode
 * pages a single function to call: pass the row's `name` + `nameEn`,
 * get back whatever's best.
 *
 * This is approximate — Korean names have multiple "correct"
 * spellings (Lee/Yi/Rhee, Kim/Gim, Park/Pak). When the cast member
 * has a preferred public spelling, the admin should set `name_en` in
 * the members table; that value wins over both the dictionary AND
 * the romanizer.
 */

/**
 * Curated Korean → English map for CheezeFilm cast members.
 * Add entries here when an admin hasn't filled `name_en` and the
 * automatic romanization comes out wrong.
 *
 * Format: full Korean name → preferred English form. For stage
 * names (single Korean word like "다솜" / "민지"), use the public
 * spelling rather than mechanical romanization.
 */
const KNOWN_NAMES: Record<string, string> = {
  // Featured cast (channel public name list)
  "조효민": "Jo Hyo-min",
  "조채윤": "Jo Chae-yoon",
  "다솜":   "Dasom",
  "민지":   "Minji",
  "선경":   "Sun-kyung",
  "유덕":   "Yu-deok",
  "소정":   "Sojung",
  "윤오":   "Yoon-oh",
  "아윤":   "A-yoon",
  "주석":   "Joo-seok",
  "주현":   "Joo-hyun",
  "예나":   "Yena",

  // Common family-name fallbacks (preferred public spellings — used
  // when a name like "김은하" needs the surname romanized even if
  // not in the curated map).
  "김":   "Kim",
  "이":   "Lee",
  "박":   "Park",
  "최":   "Choi",
  "정":   "Jung",
  "조":   "Jo",
  "강":   "Kang",
  "장":   "Jang",
  "윤":   "Yoon",
  "임":   "Lim",
  "한":   "Han",
  "오":   "Oh",
  "서":   "Seo",
  "신":   "Shin",
  "권":   "Kwon",
  "황":   "Hwang",
  "안":   "Ahn",
  "송":   "Song",
  "전":   "Jeon",
  "홍":   "Hong",
  "유":   "Yu",
  "고":   "Ko",
  "문":   "Moon",
  "양":   "Yang",
  "백":   "Baek",
  "남":   "Nam",
  "심":   "Shim",

  // Specific known channel staff
  "김은하": "Kim Eun-ha",
};

// ─── Hangul syllable decomposition + Revised Romanization ──────

// Tables aligned with the Hangul Syllable block (U+AC00..U+D7A3).
// Each Hangul syllable = (initial × 21 × 28) + (medial × 28) + final
// offset from U+AC00.
const INITIALS = [
  "g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "",
  "j", "jj", "ch", "k", "t", "p", "h",
];
const MEDIALS = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae",
  "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];
const FINALS = [
  "", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb",
  "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t",
  "k", "t", "p", "h",
];

/** Romanize a single Hangul syllable. Returns "" for non-Hangul chars. */
function romanizeSyllable(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "";
  const offset = code - 0xac00;
  const initial = Math.floor(offset / (21 * 28));
  const medial = Math.floor((offset % (21 * 28)) / 28);
  const final = offset % 28;
  return INITIALS[initial] + MEDIALS[medial] + FINALS[final];
}

/**
 * Romanize a Korean name with Revised Romanization rules, formatted
 * for Western reading order (family name first, given name hyphenated).
 *
 *   "박서영"  → "Park Seo-yeong"
 *   "김은하"  → "Kim Eun-ha"
 *   "다솜"    → "Dasom"
 *
 * Single-token stage names (no family name) come out as a single
 * capitalized word.
 */
export function romanizeHangul(name: string): string {
  const clean = name.trim();
  if (!clean) return "";

  // Multi-character family names ("선우" / "남궁" etc.) — not handling
  // here. Korean names on this channel are almost always Single Family
  // + Two Given, or single stage word.
  const syllables = Array.from(clean).filter((ch) => {
    const code = ch.charCodeAt(0);
    return code >= 0xac00 && code <= 0xd7a3;
  });

  if (syllables.length === 0) return clean; // non-Hangul (already English?)

  // Stage name (single syllable or 2-syllable word with no surname
  // pattern). Render as one capitalized token.
  if (syllables.length === 1) {
    return capitalize(romanizeSyllable(syllables[0]));
  }

  // Family name (first syllable) + given name (remaining).
  const familyEn = KNOWN_NAMES[syllables[0]] ?? capitalize(romanizeSyllable(syllables[0]));
  const givenSyllables = syllables.slice(1).map(romanizeSyllable);
  const given = givenSyllables.map((s, i) => (i === 0 ? capitalize(s) : s)).join("-");

  return `${familyEn} ${given}`;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/**
 * Best English form for a member's name.
 *
 *   1. Admin-set `nameEn` (DB column `name_en`) — authoritative.
 *   2. Curated `KNOWN_NAMES` entry — typically the channel's
 *      preferred public spelling for that person.
 *   3. Automatic `romanizeHangul()` — a reasonable approximation.
 *   4. Fall back to the original Korean if all else fails.
 */
export function resolveMemberNameEn(name: string, nameEn?: string): string {
  if (nameEn && nameEn.trim()) return nameEn.trim();
  if (KNOWN_NAMES[name]) return KNOWN_NAMES[name];
  const romanized = romanizeHangul(name);
  return romanized || name;
}
