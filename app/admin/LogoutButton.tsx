"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="text-sm border border-cheeze-cream/40 px-3 py-1 hover:bg-cheeze-cream hover:text-cheeze-ink disabled:opacity-60"
    >
      {busy ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
