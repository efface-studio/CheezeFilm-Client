"use client";

import { useEffect } from "react";

/**
 * Mounted on the print pages — pops the browser's print dialog once on
 * load so the admin lands directly in the "Save as PDF / Print" flow.
 * A small delay lets fonts (Pretendard via CDN) finish loading first.
 *
 * Append `?noprint=1` to the URL to skip the auto-fire (useful when
 * inspecting the styled page in a tool that hangs on print dialogs).
 */
export default function AutoPrint({ delayMs = 600 }: { delayMs?: number }) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("noprint") === "1"
    ) {
      return;
    }
    const t = setTimeout(() => {
      window.print();
    }, delayMs);
    return () => clearTimeout(t);
  }, [delayMs]);
  return null;
}
