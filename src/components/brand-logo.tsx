/* eslint-disable @next/next/no-img-element */
// Official Spinr lockup (lime icon + lowercase wordmark) from the brand kit
// in public/brand/. `size` is the rendered height in px; the source PNG is
// 3000×1000 (3:1) so width = 3 × height.
export function BrandLogo({ size = 30 }: { size?: number }) {
  return (
    <img
      src="/brand/spinr-lockup.png"
      alt="Spinr"
      height={size}
      width={size * 3}
      style={{ height: size, width: "auto" }}
      className="block"
    />
  );
}
