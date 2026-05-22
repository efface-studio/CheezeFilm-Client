"use client";

import { useEffect, useRef, useState } from "react";
import Confetti from "@/components/Confetti";

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

/**
 * Audition flow is two-step now: pick an open listing, then fill the form.
 * Submissions without a listing_id are rejected by the API.
 */
export default function AuditionForm() {
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
    return (
      <ApplyForm listing={picked} onBack={() => setPicked(null)} />
    );
  }

  return (
    <ListingPicker
      listings={listings}
      loadError={loadError}
      onPick={setPicked}
    />
  );
}

function ListingPicker({
  listings,
  loadError,
  onPick,
}: {
  listings: Listing[] | null;
  loadError: string;
  onPick: (l: Listing) => void;
}) {
  return (
    <div>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-[0.3em] text-cheeze-purple mb-1">
          NOW CASTING
        </div>
        <h2
          className="text-3xl mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          현재 모집중인 공고
        </h2>
        <p className="text-sm text-cheeze-ink-soft">
          지원하실 공고를 먼저 선택해주세요.
        </p>
      </div>

      {listings === null && (
        <div className="py-10 text-center text-sm text-cheeze-ink-soft/70">
          불러오는 중…
        </div>
      )}

      {listings && listings.length === 0 && (
        <div className="border-2 border-dashed border-cheeze-purple-deep/30 bg-cheeze-cream-deep/30 p-10 text-center">
          <div className="text-4xl mb-3">🎬</div>
          <h3
            className="text-2xl mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            지금은 열려 있는 오디션이 없어요.
          </h3>
          <p className="text-sm text-cheeze-ink-soft/80">
            새 작품의 캐스팅이 시작되면 이 페이지에 공고가 올라옵니다.
            <br />
            대신 응원 메시지 탭으로 마음을 전해주세요.
          </p>
        </div>
      )}

      {loadError && (
        <div className="border-2 border-cheeze-wine bg-cheeze-wine/10 p-3 text-sm text-cheeze-wine mb-4">
          ⚠ {loadError}
        </div>
      )}

      {listings && listings.length > 0 && (
        <ul className="grid gap-4">
          {listings.map((l) => (
            <li
              key={l.id}
              className="border-2 border-cheeze-purple-deep bg-cheeze-cream-deep/40 p-5 hover:bg-cheeze-cream-deep transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-cheeze-purple-deep text-cheeze-yellow">
                      {ROLE_LABEL[l.role_type]}
                    </span>
                    {l.deadline && (
                      <span className="text-[10px] uppercase tracking-widest text-cheeze-wine">
                        ~ {l.deadline} 마감
                      </span>
                    )}
                  </div>
                  <h3
                    className="text-xl"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {l.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => onPick(l)}
                  className="btn-yellow shrink-0"
                >
                  지원하기 →
                </button>
              </div>
              {l.description && (
                <p className="text-sm text-cheeze-ink-soft whitespace-pre-wrap mt-2">
                  {l.description}
                </p>
              )}
              {l.requirements && (
                <div className="mt-3 pt-3 border-t border-cheeze-purple-deep/20">
                  <div className="text-[10px] uppercase tracking-widest text-cheeze-purple-deep mb-1">
                    지원 조건
                  </div>
                  <p className="text-sm text-cheeze-ink-soft/90 whitespace-pre-wrap">
                    {l.requirements}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhotoPreview(URL.createObjectURL(file));
    else setPhotoPreview(null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    const photo = fd.get("photo");
    if (!(photo instanceof File) || photo.size === 0) {
      setStatus("error");
      setErrorMsg("프로필 사진을 첨부해주세요. (필수)");
      return;
    }

    try {
      const res = await fetch("/api/auditions", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "전송에 실패했어요.");
      }
      setStatus("success");
      form.reset();
      setPhotoPreview(null);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "오류가 발생했어요.");
    }
  }

  if (status === "success") {
    return (
      <div className="relative text-center py-10">
        <Confetti count={20} />
        <div className="text-5xl mb-4">🎬</div>
        <h3
          className="text-3xl mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          접수 완료! Take 1.
        </h3>
        <p className="text-cheeze-ink-soft">
          <strong>{listing.title}</strong>
          <br />에 지원해주셔서 감사합니다. 검토 후 연락드릴게요.
          <br />
          모든 응답은 제작팀이 한 명씩 직접 읽습니다.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="btn-yellow mt-6"
        >
          다른 공고 보기
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      {/* Pinned listing header so applicants know which call they're answering. */}
      <div className="border-2 border-cheeze-purple-deep bg-cheeze-cream-deep/40 p-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-cheeze-purple-deep mb-1">
            지원할 공고
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-cheeze-purple-deep text-cheeze-yellow">
              {ROLE_LABEL[listing.role_type]}
            </span>
            <h3 className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
              {listing.title}
            </h3>
            {listing.deadline && (
              <span className="text-xs text-cheeze-wine">
                ~ {listing.deadline} 마감
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-xs underline text-cheeze-ink-soft hover:text-cheeze-ink"
        >
          ← 다른 공고
        </button>
      </div>
      <input type="hidden" name="listing_id" value={listing.id} />

      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-cheeze-purple mb-1">
          AUDITION FORM
        </div>
        <h2
          className="text-3xl mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          치즈필름 오디션 지원서
        </h2>
        <p className="text-sm text-cheeze-ink-soft">
          정확한 검토를 위해 모든 항목을 솔직하게 작성해주세요.
        </p>
      </div>

      {/* Profile photo — required */}
      <div>
        <label className="field-label" htmlFor="photo">
          프로필 사진 *
        </label>
        <div className="flex items-start gap-4 mt-1">
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
            className="w-32 h-40 border-2 border-cheeze-purple-deep bg-cheeze-cream-deep/40 cursor-pointer overflow-hidden shrink-0 relative grid place-items-center hover:bg-cheeze-cream-deep transition-colors"
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
                <div className="text-3xl mb-1">📷</div>
                <div className="text-[10px] uppercase tracking-widest text-cheeze-olive">
                  클릭해서
                  <br />
                  사진 첨부
                </div>
              </div>
            )}
          </div>
          <div className="text-xs text-cheeze-ink-soft/80 leading-relaxed flex-1">
            <p className="text-cheeze-wine font-bold mb-1">필수 항목입니다.</p>
            얼굴이 잘 보이는 프로필 사진을 한 장 첨부해주세요. JPEG / PNG / WebP, 최대 8MB.
            과한 보정 없이 자연스러운 사진을 추천합니다.
          </div>
        </div>
        <input
          ref={fileInputRef}
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          required
          className="hidden"
          onChange={onPickPhoto}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="field-label" htmlFor="name">
            이름 *
          </label>
          <input
            id="name"
            name="name"
            required
            maxLength={50}
            className="field-input"
            placeholder="홍길동"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="age">
            나이
          </label>
          <input
            id="age"
            name="age"
            type="number"
            min={10}
            max={99}
            className="field-input"
            placeholder="만 나이"
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="field-label" htmlFor="gender">
            성별
          </label>
          <select id="gender" name="gender" className="field-select">
            <option value="">선택 안 함</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
            <option value="other">기타</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="role_preference">
            희망 포지션
          </label>
          <select
            id="role_preference"
            name="role_preference"
            className="field-select"
            defaultValue={listing.role_type}
          >
            <option value="">선택 안 함</option>
            <option value="lead">주연</option>
            <option value="support">조연</option>
            <option value="extra">단역/엑스트라</option>
            <option value="staff">스태프 (촬영/편집/연출)</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="field-label" htmlFor="email">
            이메일 *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="field-input"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="phone">
            연락처
          </label>
          <input
            id="phone"
            name="phone"
            className="field-input"
            placeholder="010-0000-0000"
          />
        </div>
      </div>

      <div>
        <label className="field-label" htmlFor="experience">
          연기/제작 경력
        </label>
        <textarea
          id="experience"
          name="experience"
          rows={3}
          className="field-textarea"
          placeholder="이전 출연작, 학원, 수상 경력 등 자유롭게 적어주세요."
        />
      </div>

      <div>
        <label className="field-label" htmlFor="intro">
          자기소개 *
        </label>
        <textarea
          id="intro"
          name="intro"
          rows={6}
          required
          maxLength={2000}
          className="field-textarea"
          placeholder="당신은 어떤 사람인가요? 어떤 역할을 잘 할 수 있을지 한 컷의 장면처럼 표현해주세요."
        />
      </div>

      <div>
        <label className="field-label" htmlFor="portfolio_url">
          포트폴리오 링크 (영상/사진)
        </label>
        <input
          id="portfolio_url"
          name="portfolio_url"
          type="url"
          className="field-input"
          placeholder="https://"
        />
      </div>

      {status === "error" && (
        <div className="border-2 border-cheeze-wine bg-cheeze-wine/10 p-3 text-sm text-cheeze-wine">
          ⚠ {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-yellow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "submitting" ? "전송 중..." : "🎬 지원서 보내기"}
        </button>
        <span className="text-xs text-cheeze-ink-soft/70">
          * 표시 항목은 필수입니다.
        </span>
      </div>
    </form>
  );
}
