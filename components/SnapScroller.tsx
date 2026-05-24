"use client";

import { useEffect } from "react";

/**
 * Adds `snap-scroll` to <html> while mounted so the home page gets
 * CSS scroll-snap on its top-level sections (see `.snap-scroll` rules in
 * globals.css). Removed on unmount so other routes scroll normally.
 *
 * Pure side effect — renders nothing.
 */
export default function SnapScroller() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("snap-scroll");
    return () => html.classList.remove("snap-scroll");
  }, []);
  return null;
}
