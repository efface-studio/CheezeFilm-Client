"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContentEntry } from "@/lib/content";

type Item = ContentEntry & {
  value: string;
  valueEn: string;
  /** True when valueEn is the registry's fallbackEn (no admin
   *  override saved yet) — used to dim the field + label the row. */
  valueEnIsDefault: boolean;
};

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
          바꿀 수 있어요. 한국어와 영어 각각 따로 저장됩니다. <strong>EN</strong> 칸에는
          기본 영문 번역이 미리 채워져 있고, <span className="inline-block align-middle text-[10px] font-bold tracking-widest uppercase bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">default</span> 표시는
          저장되지 않은 기본값임을 뜻해요. 수정하고 저장하면 사이트에 즉시 반영됩니다.
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
          // `valueEnIsDefault` flows from getAllContent — true when
          // there's no DB override for this key's `.en` variant and
          // the value shown is the registry's baked-in fallbackEn.
          // We surface that as a "default" chip in the row label so
          // the admin sees at a glance which English values are
          // theirs vs ours.
          isDefault={item.valueEnIsDefault}
          showDefaultChip={item.valueEnIsDefault && item.valueEn !== ""}
          fallbackOnReset={item.fallbackEn ?? ""}
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
  showDefaultChip = false,
  fallbackOnReset,
}: {
  label: string;
  flagClass: string;
  item: Item;
  variantKey: string;
  initialValue: string;
  isDefault: boolean;
  /** Show a small "default" chip next to the label to mark the
   *  field as showing the registry's baked-in value (not a saved
   *  override). Used on the EN row when admin hasn't customized. */
  showDefaultChip?: boolean;
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
      <div className="shrink-0 flex flex-col items-start gap-1">
        <span className={`inline-flex items-center justify-center w-9 h-7 rounded-md text-[10px] font-bold tracking-widest uppercase ${flagClass}`}>
          {label}
        </span>
        {showDefaultChip && (
          <span
            className="text-[8px] font-bold tracking-widest uppercase bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded"
            title="기본 영문 번역값이에요. 수정해서 저장하면 이 키만 따로 저장됩니다."
          >
            default
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {item.type === "longtext" ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={Math.min(8, Math.max(2, (value || "").split("\n").length + 1))}
            placeholder={label === "EN" ? "(비워두면 한국어로 표시)" : ""}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-sans transition-colors focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 placeholder:text-zinc-400"
          />
        ) : (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={label === "EN" ? "(비워두면 한국어로 표시)" : ""}
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
