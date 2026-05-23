"use client";

import { useEffect, useRef, useState } from "react";
import Confetti from "@/components/Confetti";
import BirthdateInput from "@/components/BirthdateInput";
import PhoneInput from "@/components/PhoneInput";
import { formatDeadline, formatDeadlineLong } from "@/lib/deadline";

type Status = "idle" | "submitting" | "success" | "error";

type Listing = {
  id: number;
  title: string;
  description: string;
  role_type: "lead" | "support" | "extra" | "staff";
  requirements: string;
  deadline: string | null;
  status: "draft" | "open" | "closed";
  created_at: string;
  updated_at: string;
};

const ROLE_LABEL: Record<Listing["role_type"], string> = {
  lead: "주연",
  support: "조연",
  extra: "단역",
  staff: "스태프",
};

export default function V2AuditionForm({
  onSwitchToFan,
}: {
  onSwitchToFan?: () => void;
}) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [picked, setPicked] = useState<Listing | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/audition-listings")
      .then((r) => r.json() as Promise<{ listings: Listing[] }>)
      .then((d) => {
        if (!cancelled) setListings(d.listings ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setListings([]);
          setLoadError("공고 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (picked) {
    return <ApplyForm listing={picked} onBack={() => setPicked(null)} />;
  }
  return (
    <ListingPicker
      listings={listings}
      loadError={loadError}
      onPick={setPicked}
      onSwitchToFan={onSwitchToFan}
    />
  );
}

function ListingPicker({
  listings,
  loadError,
  onPick,
  onSwitchToFan,
}: {
  listings: Listing[] | null;
  loadError: string;
  onPick: (l: Listing) => void;
  onSwitchToFan?: () => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[24px] font-bold text-cheeze-ink leading-tight">
          모집 중인 공고
        </h2>
        <p className="mt-1.5 text-[14px] text-cheeze-ink-soft">
          지원하실 공고를 먼저 선택해주세요.
        </p>
      </div>

      {/* Loading state — skeleton cards. After the palette swap a soft
          `bg-toss-100` fill reads as the canonical "list placeholder" tone. */}
      {listings === null && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-toss-100 h-24 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state — Toss-style centered card with a soft icon, friendly
          message, and a secondary CTA that hops to the fan tab. Uses
          `bg-toss-50` so the card actually shows up against the new white
          body bg (the previous `bg-white/70` was invisible after the
          palette swap). */}
      {listings && listings.length === 0 && (
        <div className="rounded-3xl bg-toss-50 px-6 py-12 text-center">
          <div
            aria-hidden
            className="mx-auto w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-3xl mb-5 shadow-sm"
          >
            🎬
          </div>
          <h3 className="text-[18px] font-bold text-cheeze-ink mb-2">
            진행 중인 오디션이 없어요
          </h3>
          <p className="text-[14px] text-cheeze-ink-soft leading-relaxed max-w-sm mx-auto">
            새 공고가 올라오면 이 페이지에서 가장 먼저 만나보실 수 있어요.
            기다리는 동안 좋아하는 작품에 응원 한마디 어떠세요?
          </p>
          {onSwitchToFan && (
            <button
              type="button"
              onClick={onSwitchToFan}
              className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cheeze-ink text-white font-semibold text-[14px] hover:bg-cheeze-ink-soft transition-colors"
            >
              응원 메시지 남기기
              <span aria-hidden>→</span>
            </button>
          )}
        </div>
      )}

      {loadError && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-[14px] text-rose-700">
          {loadError}
        </div>
      )}

      {listings && listings.length > 0 && (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l, i) => (
            <ListingItem
              key={l.id}
              listing={l}
              index={i + 1}
              total={listings.length}
              onPick={() => onPick(l)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One open call — Toss-style card. A white surface with a hairline
 * border that the whole row clicks, no inner cards, no purple-on-
 * yellow chips, no yellow underline. Role pill + deadline + title +
 * (optional) body sit in a single relaxed column; "지원하기 →"
 * floats top-right so the title doesn't have to share the eye with
 * a separate footer block.
 */
function ListingItem({
  listing: l,
  onPick,
}: {
  listing: Listing;
  index: number;
  total: number;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className="group relative block w-full text-left rounded-2xl bg-white border border-toss-200 hover:border-cheeze-purple/40 hover:shadow-[0_4px_20px_rgba(85,34,163,0.08)] transition-all p-5 sm:p-6"
      >
        {/* Floating "지원하기 →" — top-right, only visible on hover so
            the card feels calm at rest. */}
        <span
          aria-hidden
          className="absolute top-5 right-5 sm:top-6 sm:right-6 inline-flex items-center gap-1 text-[13px] font-semibold text-cheeze-purple-deep opacity-0 group-hover:opacity-100 transition-opacity"
        >
          지원하기
          <span className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>

        {/* Role pill + deadline */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-cheeze-purple/10 text-cheeze-purple-deep">
            {ROLE_LABEL[l.role_type]}
          </span>
          {l.deadline && (
            <span className="text-[12px] text-cheeze-ink-soft inline-flex items-center gap-1.5">
              <span aria-hidden className="w-1 h-1 rounded-full bg-rose-500" />
              {formatDeadlineLong(l.deadline)} 마감
            </span>
          )}
        </div>

        {/* Title — leaves headroom on the right for the floating CTA. */}
        <h3 className="mt-3 pr-28 text-[20px] font-bold leading-snug text-cheeze-ink tracking-tight">
          {l.title}
        </h3>

        {l.description && (
          <p className="mt-2 text-[14px] text-cheeze-ink-soft whitespace-pre-wrap leading-relaxed">
            {l.description}
          </p>
        )}

        {l.requirements && (
          <div className="mt-3">
            <div className="text-[12px] font-semibold text-cheeze-ink-soft mb-1">
              지원 조건
            </div>
            <p className="text-[13px] text-cheeze-ink-soft/85 whitespace-pre-wrap leading-relaxed">
              {l.requirements}
            </p>
          </div>
        )}
      </button>
    </li>
  );
}

function ApplyForm({
  listing,
  onBack,
}: {
  listing: Listing;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    const photo = fd.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      setStatus("error");
      setError("프로필 사진을 첨부해주세요. (필수)");
      return;
    }

    try {
      const res = await fetch("/api/auditions", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "전송 실패");
      }
      setStatus("success");
      form.reset();
      setPhotoPreview(null);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "오류가 발생했어요.");
    }
  }

  if (status === "success") {
    return (
      <div className="relative text-center py-16 border border-cheeze-purple-deep/40">
        <Confetti count={22} />
        <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-purple mb-4">
          — Take 1
        </div>
        <h3 className="text-4xl mb-3" style={{ fontFamily: "var(--font-display)" }}>
          접수 완료.
        </h3>
        <p className="text-cheeze-ink-soft max-w-sm mx-auto leading-relaxed">
          <strong>{listing.title}</strong>
          <br />에 지원해주셔서 감사합니다. 제작팀이 한 명씩 직접 읽고 빠르게
          검토합니다.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-8 inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-cheeze-ink text-white text-[14px] font-semibold hover:bg-cheeze-ink-soft transition-colors"
        >
          다른 공고 보기
          <span aria-hidden>→</span>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Pinned listing header — Toss-style soft card.
          Drops the bordered editorial frame + purple-on-yellow chip +
          wine deadline. Eyebrow stacks above a clean role pill +
          title + deadline row, and "다른 공고" is a quiet ghost
          button on the right. */}
      <div className="rounded-2xl bg-toss-50 px-5 py-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-cheeze-ink-soft mb-1.5">
            지원할 공고
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full bg-cheeze-purple/10 text-cheeze-purple-deep">
              {ROLE_LABEL[listing.role_type]}
            </span>
            <h3 className="text-[16px] font-bold tracking-tight text-cheeze-ink truncate">
              {listing.title}
            </h3>
            {listing.deadline && (
              <span className="text-[12px] text-cheeze-ink-soft inline-flex items-center gap-1.5">
                <span aria-hidden className="w-1 h-1 rounded-full bg-rose-500" />
                {formatDeadline(listing.deadline)} 마감
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl text-[13px] font-semibold text-cheeze-ink-soft hover:bg-white transition-colors"
        >
          <span aria-hidden>←</span>
          다른 공고
        </button>
      </div>
      <input type="hidden" name="listing_id" value={listing.id} />

      <div>
        <div className="text-[10px] tracking-[0.4em] uppercase text-cheeze-purple mb-2">
          — Audition form
        </div>
        <h2 className="text-3xl tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          오디션 지원서
        </h2>
        <p className="mt-2 text-sm text-cheeze-ink-soft">
          정확한 검토를 위해 모든 항목을 솔직하게 작성해주세요.
        </p>
      </div>

      <FieldGroup title="프로필 사진 *">
        <div className="flex items-start gap-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="w-32 h-40 border border-cheeze-purple-deep/40 hover:border-cheeze-purple-deep bg-cheeze-cream-deep/30 cursor-pointer overflow-hidden shrink-0 relative grid place-items-center transition-colors"
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="미리보기"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="text-center px-2">
                <div className="text-2xl mb-1">📷</div>
                <div className="text-[10px] uppercase tracking-widest text-cheeze-olive">
                  Click to upload
                </div>
              </div>
            )}
          </div>
          <div className="text-xs text-cheeze-ink-soft/80 leading-relaxed flex-1">
            <p className="text-cheeze-purple-deep font-bold mb-1">필수 첨부 항목</p>
            얼굴이 잘 보이는 프로필 사진 한 장. JPEG · PNG · WebP, 8MB 이하.
          </div>
        </div>
        <input
          ref={fileInputRef}
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          required
          className="hidden"
          onChange={onPickPhoto}
        />
      </FieldGroup>

      <FieldGroup title="기본 정보">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="이름" name="name" required maxLength={50} placeholder="홍길동" />
          <label className="block">
            <span className="text-xs tracking-widest uppercase text-cheeze-olive">
              생년월일
            </span>
            <BirthdateInput
              className="mt-1.5 w-full bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm placeholder:text-cheeze-olive/50"
            />
          </label>
          <SelectField label="성별" name="gender">
            <option value="">선택 안 함</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
            <option value="other">기타</option>
          </SelectField>
          <SelectField
            label="희망 포지션"
            name="role_preference"
            defaultValue={listing.role_type}
          >
            <option value="">선택 안 함</option>
            <option value="lead">주연</option>
            <option value="support">조연</option>
            <option value="extra">단역/엑스트라</option>
            <option value="staff">스태프 (촬영/편집/연출)</option>
          </SelectField>
        </div>
      </FieldGroup>

      <FieldGroup title="연락처">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
          <Field label="이메일" name="email" type="email" required placeholder="you@example.com" />
          <label className="block">
            <span className="text-xs tracking-widest uppercase text-cheeze-olive">
              연락처
            </span>
            <PhoneInput
              className="mt-1.5 w-full bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm placeholder:text-cheeze-olive/50"
            />
          </label>
        </div>
      </FieldGroup>

      <FieldGroup title="경력 & 자기소개">
        <TextareaField
          label="연기/제작 경력"
          name="experience"
          rows={3}
          placeholder="이전 출연작·학원·수상 경력 등 자유롭게."
        />
        <TextareaField
          label="자기소개"
          name="intro"
          rows={6}
          required
          maxLength={2000}
          placeholder="당신은 어떤 사람인가요? 어떤 역할을 잘 할 수 있을지 한 컷의 장면처럼 표현해주세요."
        />
        <Field label="포트폴리오 링크" name="portfolio_url" type="url" placeholder="https://" />
      </FieldGroup>

      {status === "error" && (
        <div className="border border-cheeze-wine bg-cheeze-wine/5 px-4 py-3 text-sm text-cheeze-wine">
          ⚠ {error}
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-toss-100">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex items-center gap-1.5 px-6 py-3.5 rounded-xl bg-cheeze-ink text-white text-[15px] font-semibold hover:bg-cheeze-ink-soft disabled:bg-toss-200 disabled:text-toss-500 disabled:cursor-not-allowed transition-colors"
        >
          {status === "submitting" ? "전송 중…" : "지원서 제출하기"}
          {status !== "submitting" && <span aria-hidden>→</span>}
        </button>
        <span className="text-[12px] text-cheeze-ink-soft">
          필수 항목은 *로 표시됩니다.
        </span>
      </div>
    </form>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid lg:grid-cols-[160px_1fr] gap-x-8 gap-y-5 pt-6 border-t border-cheeze-purple-deep/15">
      <div className="text-[10px] tracking-[0.35em] uppercase text-cheeze-purple-deep">
        {title}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest uppercase text-cheeze-olive">
        {label}
        {required && <span className="text-cheeze-purple ml-1">*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1.5 w-full bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm placeholder:text-cheeze-olive/50"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  children,
  defaultValue = "",
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest uppercase text-cheeze-olive">{label}</span>
      <select
        name={name}
        className="mt-1.5 w-full bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm"
        defaultValue={defaultValue}
      >
        {children}
      </select>
    </label>
  );
}

function TextareaField({
  label,
  name,
  rows = 4,
  required,
  placeholder,
  maxLength,
}: {
  label: string;
  name: string;
  rows?: number;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest uppercase text-cheeze-olive">
        {label}
        {required && <span className="text-cheeze-purple ml-1">*</span>}
      </span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="mt-1.5 w-full bg-transparent border border-cheeze-purple-deep/30 focus:border-cheeze-purple-deep outline-none p-3 text-sm placeholder:text-cheeze-olive/50"
      />
    </label>
  );
}
