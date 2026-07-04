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
        <defs>
          <linearGradient id="brand-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#18E4C9" />
            <stop offset="1" stopColor="#9381FF" />
          </linearGradient>
        </defs>
        {/* Rotating arc: 270deg circular arc with an arrowhead — spin motif for Spinr */}
        <path
          d="M40 24 A16 16 0 1 1 24 8"
          stroke="url(#brand-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Arrowhead at the top */}
        <path
          d="M24 4 L28 8 L24 12"
          stroke="url(#brand-grad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Small dot in the center to anchor the spin */}
        <circle cx="24" cy="24" r="3" fill="url(#brand-grad)" />
      </svg>
      <span
        className="font-display text-[28px] leading-none text-fw-text"
        style={{ fontStyle: "italic", fontWeight: 600 }}
      >
        Spinr
      </span>
    </div>
  );
}
