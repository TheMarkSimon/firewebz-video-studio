// Lemonade-style line-art SVG illustrations for category cards.
// Aesthetic rules:
// - 1.5px stroke, dark charcoal (#2D3748)
// - Surfaces filled with light grey (#E2E8F0) for flat-shaded depth
// - Square viewBox so they scale uniformly inside the 96-128px card slot

const STROKE = "#2D3748";
const FILL = "#E2E8F0";
const STROKE_WIDTH = 1.5;

type IconProps = { className?: string };

export function FashionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* T-shirt: body */}
      <path
        d="M22 32 L36 22 L40 26 Q48 30 56 26 L60 22 L74 32 L66 42 L62 38 L62 78 L34 78 L34 38 L30 42 Z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      {/* Neckline curve */}
      <path
        d="M40 26 Q48 32 56 26"
        fill="none"
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function FoodIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Plate */}
      <ellipse cx="48" cy="62" rx="32" ry="6" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Fork */}
      <path d="M30 18 L30 42 M26 18 L26 30 M34 18 L34 30 M22 18 L22 30" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <rect x="24" y="30" width="12" height="4" rx="1" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <path d="M30 34 L30 58" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Knife */}
      <path d="M60 18 L62 38 L66 38 L64 18 Z" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
      <path d="M64 38 L64 58" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

export function BeautyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bottle body */}
      <rect x="32" y="36" width="32" height="44" rx="4" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Bottle neck */}
      <rect x="40" y="24" width="16" height="14" fill="white" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Cap */}
      <rect x="38" y="16" width="20" height="10" rx="2" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Label */}
      <rect x="38" y="48" width="20" height="20" rx="2" fill="white" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Sparkle */}
      <path d="M70 28 L72 32 L76 34 L72 36 L70 40 L68 36 L64 34 L68 32 Z" fill={STROKE} />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Roof */}
      <path d="M16 46 L48 18 L80 46 Z" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
      {/* Diagonal grid on roof */}
      <path d="M28 38 L36 46 M40 30 L48 38 L40 46 M52 30 L60 38 L52 46 M64 38 L72 46" stroke={STROKE} strokeWidth={0.6} strokeLinecap="round" />
      {/* Body */}
      <rect x="24" y="46" width="48" height="32" fill="white" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Door */}
      <rect x="42" y="56" width="12" height="22" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <circle cx="51" cy="68" r="0.8" fill={STROKE} />
      {/* Window */}
      <rect x="30" y="54" width="8" height="8" fill="white" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <rect x="58" y="54" width="8" height="8" fill="white" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    </svg>
  );
}

export function HealthIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Heart */}
      <path
        d="M48 78 C48 78 18 60 18 38 C18 28 26 22 34 22 C40 22 45 26 48 32 C51 26 56 22 62 22 C70 22 78 28 78 38 C78 60 48 78 48 78 Z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      {/* ECG line */}
      <path
        d="M22 48 L34 48 L38 40 L44 56 L50 44 L54 48 L74 48"
        fill="none"
        stroke={STROKE}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TechIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chip body */}
      <rect x="24" y="24" width="48" height="48" rx="4" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Inner square */}
      <rect x="34" y="34" width="28" height="28" rx="2" fill="white" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Pins */}
      {[34, 42, 50, 58].map((x) => (
        <g key={x}>
          <line x1={x} y1="14" x2={x} y2="24" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
          <line x1={x} y1="72" x2={x} y2="82" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        </g>
      ))}
      {[34, 42, 50, 58].map((y) => (
        <g key={`r${y}`}>
          <line x1="14" y1={y} x2="24" y2={y} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
          <line x1="72" y1={y} x2="82" y2={y} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

export function ServicesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Briefcase body */}
      <rect x="14" y="30" width="68" height="48" rx="4" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Handle */}
      <path d="M36 30 L36 22 Q36 18 40 18 L56 18 Q60 18 60 22 L60 30" fill="none" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
      {/* Latch / center seam */}
      <line x1="14" y1="48" x2="82" y2="48" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <rect x="42" y="44" width="12" height="8" rx="1" fill="white" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
    </svg>
  );
}

export function OtherIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Box */}
      <path d="M24 36 L48 24 L72 36 L72 70 L48 82 L24 70 Z" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
      <path d="M24 36 L48 48 L72 36" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
      <path d="M48 48 L48 82" stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      {/* Question mark on the front */}
      <text x="38" y="72" fill={STROKE} fontSize="16" fontWeight="700" fontFamily="system-ui">?</text>
    </svg>
  );
}

export function FriendlyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="48" cy="48" r="30" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <circle cx="38" cy="42" r="2.5" fill={STROKE} />
      <circle cx="58" cy="42" r="2.5" fill={STROKE} />
      <path d="M36 56 Q48 66 60 56" fill="none" stroke={STROKE} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function PlayfulIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Party popper / confetti */}
      <path d="M20 76 L34 38 L58 62 Z" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" />
      <circle cx="62" cy="32" r="3" fill={STROKE} />
      <circle cx="74" cy="44" r="2.5" fill={STROKE} />
      <circle cx="68" cy="22" r="2" fill={STROKE} />
      <path d="M70 60 L78 60 M74 56 L74 64" stroke={STROKE} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

export function BoldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lightning bolt */}
      <path
        d="M52 12 L26 54 L42 54 L36 84 L70 38 L52 38 Z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PremiumIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 96 96" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crown */}
      <path
        d="M16 64 L20 32 L34 50 L48 24 L62 50 L76 32 L80 64 Z"
        fill={FILL}
        stroke={STROKE}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
      />
      <rect x="16" y="64" width="64" height="8" fill={FILL} stroke={STROKE} strokeWidth={STROKE_WIDTH} />
      <circle cx="48" cy="44" r="2.5" fill={STROKE} />
    </svg>
  );
}
