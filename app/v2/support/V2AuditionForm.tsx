"use client";

import { useRef, useState } from "react";
import Confetti from "@/components/Confetti";

type Status = "idle" | "submitting" | "success" | "error";

export default function V2AuditionForm() {
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
          지원해주셔서 감사합니다. 제작팀이 한 명씩 직접 읽고 빠르게 검토합니다.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-8 text-xs font-bold tracking-widest uppercase px-5 py-3 bg-cheeze-purple-deep text-cheeze-yellow hover:bg-cheeze-purple transition-colors"
        >
          한 번 더 지원
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
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
          <Field label="나이" name="age" type="number" placeholder="만 나이" />
          <SelectField label="성별" name="gender">
            <option value="">선택 안 함</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
            <option value="other">기타</option>
          </SelectField>
          <SelectField label="희망 포지션" name="role_preference">
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
          <Field label="연락처" name="phone" placeholder="010-0000-0000" />
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

      <div className="flex items-center gap-4 pt-2 border-t border-cheeze-purple-deep/15">
        <button
          type="submit"
          disabled={status === "submitting"}
          className="text-sm font-bold tracking-widest uppercase px-6 py-3.5 bg-cheeze-purple-deep text-cheeze-yellow hover:bg-cheeze-purple disabled:bg-cheeze-olive/40 transition-colors"
        >
          {status === "submitting" ? "전송 중..." : "Submit audition →"}
        </button>
        <span className="text-xs text-cheeze-olive">필수 항목은 *로 표시됩니다.</span>
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
}: {
  label: string;
  name: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs tracking-widest uppercase text-cheeze-olive">{label}</span>
      <select
        name={name}
        className="mt-1.5 w-full bg-transparent border-b border-cheeze-purple-deep/40 focus:border-cheeze-purple-deep outline-none py-2 text-sm"
        defaultValue=""
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
