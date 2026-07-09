/* eslint-disable @next/next/no-img-element */
// The Spinr swirl mark as an inline icon — used beside CTAs instead of the
// generic lucide "AI sparkle" (founder call: brand mark everywhere).
// The source SVG is the black swirl; it sits on white and lime fills alike.
export function SpinrIcon({ className }: { className?: string }) {
  return <img src="/brand/spinr-icon.svg" alt="" aria-hidden className={className} />;
}
