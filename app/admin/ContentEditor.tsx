"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContentEntry } from "@/lib/content";

type Item = ContentEntry & { value: string; valueEn: string };

export default function ContentEditor({ items }: { items: Item[] }) {
  const grouped = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.section] ||= []).push(it);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-purple-100 bg-purple-50/40 p-4 text-sm text-zinc-700 leading-relaxed flex items-start gap-3">
        <span className="inline-flex w-6 h-6 rounded-full bg-purple-600 text-white text-[11px] font-bold grid place-items-center shrink-0 mt-0.5" aria-hidden>
          i
        </span>
        <span>
          <strong className="text-zinc-900">사이트의 모든 텍스트</strong>를 여기서
          바꿀 수 있어요. 한국어와 영어 각각 따로 저장됩니다 —
          영어를 비워두면 사이트가 영어 모드여도 한국어로 폴백돼요. 저장 즉시
          메인 사이트에 반영됩니다.
        </span>
      </div>
      {Object.entries(grouped).map(([section, entries]) => (
        <section key={section}>
          <h3 className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3 font-semibold">
            {section}
          </h3>
          <div className="rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100">
            {entries.map((it) => (
              <ContentRow key={it.key} item={it} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ContentRow({ item }: { item: Item }) {
  return (
    <div className="p-4 grid sm:grid-cols-[200px_1fr] gap-3 sm:gap-5 items-start">
      <div className="text-sm">
        <div className="font-semibold text-zinc-900">{item.label}</div>
        <div className="mt-1 text-[11px] font-mono text-zinc-400 break-all">
          {item.key}
        </div>
      </div>
      <div className="space-y-3">
        <ContentField
          label="KO"
          flagClass="bg-cheeze-purple/10 text-cheeze-purple"
          item={item}
          variantKey={item.key}
          initialValue={item.value}
          isDefault={item.value === item.fallback}
          fallbackOnReset={item.fallback}
        />
        <ContentField
          label="EN"
          flagClass="bg-zinc-100 text-zinc-700"
          item={item}
          variantKey={`${item.key}.en`}
          initialValue={item.valueEn}
          // English is opt-in — there's no registry fallback. "Default"
          // means "no English override set yet".
          isDefault={item.valueEn === ""}
          fallbackOnReset=""
        />
      </div>
    </div>
  );
}

/**
 * One value field inside a ContentRow — either the KO or EN variant.
 * Both use the same /api/admin/content endpoint; the URL is keyed by
 * `variantKey` (bare for KO, `.en` suffix for EN).
 */
function ContentField({
  label,
  flagClass,
  item,
  variantKey,
  initialValue,
  isDefault,
  fallbackOnReset,
}: {
  label: string;
  flagClass: string;
  item: Item;
  variantKey: string;
  initialValue: string;
  isDefault: boolean;
  fallbackOnReset: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const dirty = value !== initialValue;

  async function save() {
    setError("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: variantKey, value }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "저장 실패");
      }
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }

  async function reset() {
    if (!confirm(`"${item.label}" (${label}) 값을 ${label === "EN" ? "지울까요" : "초기값으로 되돌릴까요"}?`)) return;
    setError("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: variantKey, reset: true }),
      });
      if (!res.ok) throw new Error("초기화 실패");
      setValue(fallbackOnReset);
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    }
  }

  return (
    <div className="flex items-start gap-3">
      <span className={`shrink-0 inline-flex items-center justify-center w-9 h-7 rounded-md text-[10px] font-bold tracking-widest uppercase ${flagClass}`}>
        {label}
      </span>
      <div className="flex-1 min-w-0">
        {item.type === "longtext" ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={Math.min(8, Math.max(2, (value || "").split("\n").length + 1))}
            placeholder={label === "EN" ? "(영어 미입력 시 한국어로 표시)" : ""}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-sans transition-colors focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 placeholder:text-zinc-400"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={label === "EN" ? "(영어 미입력 시 한국어로 표시)" : ""}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-sans transition-colors focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 placeholder:text-zinc-400"
          />
        )}
        {error && <div className="mt-1 text-xs text-red-600">⚠ {error}</div>}
        {savedAt && !dirty && !error && (
          <div className="mt-1 text-xs text-emerald-600">
            ✓ 저장됨 {savedAt}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 active:scale-[0.98] transition-all disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {pending ? "..." : "저장"}
        </button>
        {!isDefault && (
          <button
            type="button"
            onClick={reset}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
            title={label === "EN" ? "영어 입력값 지우기" : "초기값으로 되돌리기"}
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
}
