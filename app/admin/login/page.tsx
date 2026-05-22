import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata = { title: "관리자 로그인 | 치즈필름" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");

  return (
    <div className="admin-shell font-pretendard min-h-screen flex items-center justify-center bg-zinc-100 px-5 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="block text-center text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-900 mb-6"
        >
          ← 메인 사이트로
        </Link>

        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="px-7 pt-7 pb-2 flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-600 overflow-hidden ring-4 ring-purple-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/cheeze-logo.png"
                alt="CheezeFilm"
                className="w-full h-full object-cover"
              />
            </span>
            <div>
              <h1 className="text-lg font-bold text-zinc-900">치즈필름 관리자</h1>
              <p className="text-xs text-zinc-500">Studio Cheeze · Admin</p>
            </div>
          </div>

          <div className="px-7 py-6">
            <LoginForm />
          </div>

          <div className="px-7 py-4 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-500 text-center leading-relaxed">
            기본 계정 ·{" "}
            <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded">admin</code>{" "}
            /{" "}
            <code className="bg-white border border-zinc-200 px-1 py-0.5 rounded">cheeze2017!</code>
            <br />
            <span className="text-zinc-400">.env.local에서 변경 가능</span>
          </div>
        </div>
      </div>
    </div>
  );
}
