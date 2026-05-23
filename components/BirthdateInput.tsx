"use client";

import { useState } from "react";
import {
  computeAgeFromBirthdate,
  formatBirthdate,
  isValidBirthdate,
} from "@/lib/koreanFormat";

/**
 * 생년월일 입력. 숫자만 입력해도 `1995-05-15` 형식으로 자동 정렬되고,
 * 유효한 날짜가 들어오면 `만 X세` 를 우측에 표시합니다.
 *
 *   사용자 입력: `19950515`
 *   화면 표시  : `1995-05-15  · 만 30세`
 *   폼 제출 값 : `1995-05-15`  (name=birthdate)
 */
export default function BirthdateInput({
  name = "birthdate",
  initial = "",
  required,
  className = "field-input",
  id,
}: {
  name?: string;
  initial?: string;
  required?: boolean;
  className?: string;
  id?: string;
}) {
  const [value, setValue] = useState(formatBirthdate(initial));
  const valid = isValidBirthdate(value);
  const age = valid ? computeAgeFromBirthdate(value) : null;
  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="bday"
        name={name}
        required={required}
        value={value}
        onChange={(e) => setValue(formatBirthdate(e.target.value))}
        className={className}
        placeholder="YYYY-MM-DD"
        maxLength={10}
      />
      {age !== null && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-cheeze-olive"
          aria-hidden
        >
          만 {age}세
        </span>
      )}
    </div>
  );
}
