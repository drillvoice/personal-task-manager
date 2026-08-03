/**
 * Inline style for a bare text input or textarea — transparent over whatever
 * card it sits on, with the standard rule and ink colours. Tailwind can't reach
 * the `@theme` custom properties for these three, so the object is shared
 * rather than each form redeclaring it.
 */
export const inputStyle = {
  background: "transparent",
  borderColor: "var(--color-line)",
  color: "var(--color-ink)",
} as const;
