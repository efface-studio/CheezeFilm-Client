import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "관리자 로그인 | 치즈필름" };

/**
 * Admin login — Toss-inspired surface.
 *
 * Single-column, no card chrome. The whole page is a clean white
 * background with the brand chip, a big bold question, two pill-style
 * input fills, and one dark primary button. Errors land inline below
 * the password field instead of taking up their own banner.
 *
 * The default-credentials line at the bottom is only meaningful in
 * development, so we gate it on NODE_ENV — production deployments stop
 * leaking the seed password in plain HTML.
 */
export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <div className="admin-shell font-pretendard min-h-screen flex flex-col bg-white">
      {/* Utility row — just a back link, top-left. Keeps the visual
          weight of the form anchored in the page's center. */}
      <div className="px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <span aria-hidden>←</span> 메인 사이트로
        </Link>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-[400px]">
          {/* Brand chip + heading. The chip is a soft, rounded square
              (not a circle) — feels more app-icon, less chip-band. */}
          <div className="mb-10">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-600 overflow-hidden mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cheeze-logo.png"
                alt=""
                className="w-full h-full object-cover"
              />
            </span>
            <h1 className="text-[26px] font-bold text-zinc-900 leading-[1.25] tracking-tight">
              관리자 로그인
            </h1>
            <p className="text-[15px] text-zinc-500 mt-2 leading-relaxed">
              치즈필름 콘텐츠를 관리해요.
            </p>
          </div>

          <LoginForm />
        </div>
      </main>

    </div>
  );
}
