// Placeholder mark until the final logo lands. Single brand color, no
// gradients — one dominant color on monochrome is the whole design system.
const BRAND = "#FF5A00";

export function BrandLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Rotating arc: 270deg circular arc with an arrowhead — spin motif for Spinr */}
        <path
          d="M40 24 A16 16 0 1 1 24 8"
          stroke={BRAND}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M24 4 L28 8 L24 12"
          stroke={BRAND}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <circle cx="24" cy="24" r="3" fill={BRAND} />
      </svg>
      <span
        className="font-display text-[26px] leading-none text-fw-text"
        style={{ fontStyle: "italic", fontWeight: 600 }}
      >
        Spinr
      </span>
    </div>
  );
}
