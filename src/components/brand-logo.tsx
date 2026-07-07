/* eslint-disable @next/next/no-img-element */
// Official Spinr lockup, black-and-white variant (user's pick for the header —
// the lime stays in CTAs/highlights, not the logo). Source PNG is 3639×1214
// (~3:1). `size` = rendered height in px.
export function BrandLogo({ size = 40, variant = "black" }: { size?: number; variant?: "black" | "white" }) {
  return (
    <img
      src={variant === "white" ? "/brand/spinr-lockup-white.png" : "/brand/spinr-lockup-black.png"}
      alt="Spinr"
      height={size}
      width={Math.round(size * 3)}
      style={{ height: size, width: "auto" }}
      className="block"
    />
  );
}
