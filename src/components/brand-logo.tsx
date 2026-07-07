/* eslint-disable @next/next/no-img-element */
// Spinr wordmark (icon-as-S + "pinr"), cropped from the official lockup —
// the user wants only the wordmark in the header, no standalone icon.
// Source PNG is 2299×1214 (~1.9:1). `size` = rendered height in px.
export function BrandLogo({ size = 40, variant = "black" }: { size?: number; variant?: "black" | "white" }) {
  return (
    <img
      src={variant === "white" ? "/brand/spinr-wordmark-white.png" : "/brand/spinr-wordmark-black.png"}
      alt="Spinr"
      height={size}
      width={Math.round(size * 1.9)}
      style={{ height: size, width: "auto" }}
      className="block"
    />
  );
}
