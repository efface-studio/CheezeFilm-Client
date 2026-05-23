import Link from "next/link";
import { getContent, loadContentMap } from "@/lib/content";

export default async function SiteFooter() {
  const year = new Date().getFullYear();
  const contentMap = await loadContentMap();
  const c = (key: string) => getContent(contentMap, key);
  const copyrightTemplate = c("footer.copyright");
  const copyright = copyrightTemplate.replace("{year}", String(year));

  return (
    // Note: no top film-strip here — the CTA section above already provides
    // a film-strip frame, and two strips back-to-back looked like a "double
    // footer" with awkward dead space between them.
    <footer className="mt-16 border-t-2 border-cheeze-purple-deep bg-cheeze-purple-deep text-cheeze-cream">
      <div className="mx-auto max-w-6xl px-5 py-12 grid md:grid-cols-3 gap-10">
        {/* Brand + tagline */}
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cheeze-purple border-2 border-cheeze-cream/30 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cheeze-logo.png"
                alt="CheezeFilm logo"
                className="w-full h-full object-cover"
              />
            </span>
            <div
              className="font-display text-2xl text-cheeze-yellow"
              style={{ fontFamily: "var(--font-display)" }}
            >
              치즈필름
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-cheeze-cream/80 whitespace-pre-line">
            {c("footer.tagline")}
          </p>
          <div className="mt-5 flex items-center gap-3">
            <a
              href="https://www.youtube.com/@CheezeFilmz"
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2.5 py-1.5 border border-cheeze-cream/30 hover:bg-cheeze-yellow hover:text-cheeze-purple-deep hover:border-cheeze-yellow rounded transition-colors"
            >
              YouTube ↗
            </a>
            <a
              href="https://www.instagram.com/cheezefilm.official/"
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2.5 py-1.5 border border-cheeze-cream/30 hover:bg-cheeze-yellow hover:text-cheeze-purple-deep hover:border-cheeze-yellow rounded transition-colors"
            >
              Instagram ↗
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="text-xs uppercase tracking-[0.3em] text-cheeze-yellow">
            바로가기
          </h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/#story" className="hover:text-cheeze-yellow">
                채널 소개
              </Link>
            </li>
            <li>
              <Link href="/#works" className="hover:text-cheeze-yellow">
                대표작
              </Link>
            </li>
            <li>
              <Link href="/videos" className="hover:text-cheeze-yellow">
                전체 영상
              </Link>
            </li>
            <li>
              <Link href="/members" className="hover:text-cheeze-yellow">
                멤버 소개
              </Link>
            </li>
            <li>
              <Link href="/support" className="hover:text-cheeze-yellow">
                지원하기 (오디션·응원)
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-cheeze-yellow">
                관리자
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-xs uppercase tracking-[0.3em] text-cheeze-yellow">
            문의
          </h4>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <div className="text-cheeze-cream/55 text-xs">비즈니스</div>
              <a
                href={`mailto:${c("contact.business")}`}
                className="hover:text-cheeze-yellow break-all"
              >
                {c("contact.business")}
              </a>
            </li>
            <li>
              <div className="text-cheeze-cream/55 text-xs">오디션·캐스팅</div>
              <a
                href={`mailto:${c("contact.audition")}`}
                className="hover:text-cheeze-yellow break-all"
              >
                {c("contact.audition")}
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Single bottom strip: company info inline + copyright + credit. One line on desktop. */}
      <div className="border-t border-cheeze-cream/15">
        <div className="mx-auto max-w-6xl px-5 py-5 text-[11px] text-cheeze-cream/65 leading-relaxed">
          <CompanyInline contentMap={contentMap} />
          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-cheeze-cream/70">
            <div>{copyright}</div>
            <div className="flex items-center gap-2">
              <span className="opacity-60">Crafted by</span>
              <a
                href="https://efface.dev"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 font-bold text-cheeze-yellow hover:text-cheeze-cream"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cheeze-yellow group-hover:bg-cheeze-cream transition-colors" />
                efface
                <span className="text-cheeze-cream/40 group-hover:text-cheeze-cream/70 transition-colors">
                  · efface.dev ↗
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/**
 * Single-line corporate footer strip in the Korean convention:
 *   상호 (주)스튜디오 치즈 · 대표 김은하 · 사업자등록번호 — · 통신판매업신고 — · 주소 ... · TEL —
 * Each "—" is editable via /admin → 사이트 콘텐츠.
 */
function CompanyInline({ contentMap }: { contentMap: Map<string, string> }) {
  const c = (key: string) => getContent(contentMap, key);
  const items = [
    { label: "상호", value: c("company.name") },
    { label: "대표", value: c("company.ceo") },
    { label: "사업자등록번호", value: c("company.business_no") },
    { label: "통신판매업신고", value: c("company.commerce_no") },
    { label: "MCN", value: c("company.network") },
    { label: "주소", value: c("company.address") },
    { label: "TEL", value: c("company.phone") },
  ];
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      {items.map((it, i) => (
        <span key={it.label} className="inline-flex items-baseline gap-1.5">
          <span className="text-cheeze-cream/40">{it.label}</span>
          <span className="text-cheeze-cream/85">{it.value}</span>
          {i < items.length - 1 && (
            <span className="text-cheeze-cream/25 ml-1.5">·</span>
          )}
        </span>
      ))}
    </div>
  );
}
