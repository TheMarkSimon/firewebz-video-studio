/* eslint-disable @next/next/no-img-element */
// The Spinr swirl mark as an inline icon — used beside CTAs and as brand
// accents instead of generic lucide icons (founder call: brand mark
// everywhere).
//
// Variant picks contrast, not decoration:
//   black — on lime buttons and light backgrounds (the default)
//   green — on black/dark surfaces (lime is a FILL, per brand rules)
//   white — reserved for photography/dark-media overlays
export function SpinrIcon({
  className,
  variant = "black",
}: {
  className?: string;
  variant?: "black" | "green" | "white";
}) {
  const src =
    variant === "green"
      ? "/brand/spinr-mark-green.png"
      : variant === "white"
        ? "/brand/spinr-mark-white.png"
        : "/brand/spinr-mark-black.png";
  return <img src={src} alt="" aria-hidden className={className} />;
}
