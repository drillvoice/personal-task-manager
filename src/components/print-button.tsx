"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="font-mono rounded-full px-4 py-2 text-[12px] font-semibold"
      style={{ background: "var(--color-ink)", color: "var(--color-paper)" }}
    >
      Print / Save as PDF
    </button>
  );
}
