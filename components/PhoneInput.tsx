"use client";

import { useState } from "react";
import { formatKoreanPhone } from "@/lib/koreanFormat";

/**
 * 010 전용 한국 휴대전화 입력. 사용자가 `01028492919` 처럼 붙여 써도
 * 입력하는 동안 자동으로 `010-2849-2919` 형식으로 정렬됩니다.
 *
 * - `010` 으로 시작 안 하면 입력하는 동안 강제 교정
 * - 11자리 초과는 잘라냄
 * - 폼 제출 시 `name=phone` 값으로 dash 포함된 포맷이 들어감
 */
export default function PhoneInput({
  name = "phone",
  initial = "",
  required,
  className = "field-input",
  placeholder = "010-0000-0000",
  id,
}: {
  name?: string;
  initial?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
}) {
  const [value, setValue] = useState(formatKoreanPhone(initial));
  return (
    <input
      id={id}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      name={name}
      required={required}
      value={value}
      onChange={(e) => setValue(formatKoreanPhone(e.target.value))}
      className={className}
      placeholder={placeholder}
      maxLength={13}
    />
  );
}
