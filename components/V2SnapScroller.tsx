"use client";

import { useEffect } from "react";

/**
 * Adds `v2-snap` to <html> while mounted so the V2 home page gets
 * CSS scroll-snap on its top-level sections (see `.v2-snap` rules in
 * globals.css). Removed on unmount so other routes scroll normally.
 *
 * Pure side effect — renders nothing.
 */
export default function V2SnapScroller() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add("v2-snap");
    return () => html.classList.remove("v2-snap");
  }, []);
  return null;
}
