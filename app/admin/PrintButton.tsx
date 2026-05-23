"use client";

/**
 * Trigger the browser's print dialog. Used inside print pages.
 * Hidden via @media print so it doesn't show up on the saved PDF.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print"
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: "10px 16px",
        background: "#7c3aed",
        color: "white",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
      }}
    >
      ⎙ 인쇄 / PDF로 저장
    </button>
  );
}
