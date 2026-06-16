export function FirewebzLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="fw-logo-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#18E4C9" />
            <stop offset="1" stopColor="#9381FF" />
          </linearGradient>
        </defs>
        <path
          d="M24 4 L42 18 L36 40 L12 40 L6 18 Z"
          stroke="url(#fw-logo-grad)"
          strokeWidth="3"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M18 22 H30 M18 28 H26" stroke="url(#fw-logo-grad)" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="font-display text-[28px] leading-none text-fw-text" style={{ fontStyle: "italic", fontWeight: 600 }}>
        Firewebz
      </span>
    </div>
  );
}
