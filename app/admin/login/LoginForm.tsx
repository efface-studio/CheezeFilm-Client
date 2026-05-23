"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Toss-style login form.
 *
 *   - Inputs are pill-shaped, filled with `bg-zinc-100` by default and
 *     swap to white + a soft ring on focus. No visible border in either
 *     state — the fill + focus ring carry the entire focus signal.
 *   - Errors are inline red text under the password field, not a
 *     dedicated alert block.
 *   - Primary button is full-width, dark, large (56px tall) — the only
 *     element that asks to be clicked.
 */
export default function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Track the two fields so we can disable the submit button until both
  // are filled. (`required` alone would only kick in on submit.)
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const canSubmit = username.trim().length > 0 && password.length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const payload = {
      username: String(fd.get("username") ?? "").trim(),
      password: String(fd.get("password") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "로그인 정보를 다시 확인해주세요.");
      }
      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했어요.");
      setSubmitting(false);
    }
  }

  const fieldClass =
    "w-full bg-zinc-100 rounded-xl px-4 py-4 text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/40 transition";

  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <div>
        <label
          htmlFor="username"
          className="block text-[13px] font-medium text-zinc-600 mb-1.5 ml-1"
        >
          아이디
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          spellCheck={false}
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={fieldClass}
          placeholder="아이디를 입력해주세요"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-[13px] font-medium text-zinc-600 mb-1.5 ml-1"
        >
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
          placeholder="비밀번호를 입력해주세요"
        />
        {error && (
          <p
            role="alert"
            className="mt-2 ml-1 text-[13px] text-rose-600 leading-tight"
          >
            {error}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="!mt-7 w-full h-[56px] rounded-xl bg-zinc-900 text-white font-bold text-[16px] hover:bg-zinc-800 active:bg-black disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "로그인 중…" : "로그인"}
      </button>
    </form>
  );
}
