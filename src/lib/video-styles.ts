// The 4 video styles a user can pick during onboarding. Each maps to a tuned
// Runway prompt template so what we describe to the SMB matches what Runway
// actually renders (image-to-video — camera/lighting/motion only, never new
// scenes or people).

export type VideoStyleKey =
  | "product_spotlight"
  | "spin_360"
  | "cinematic_closeup"
  | "lifestyle_motion";

export interface VideoStyleDef {
  key: VideoStyleKey;
  label: string;
  blurb: string; // shown on the cube
  // Brief, plain-English description used to seed the LLM's user-facing copy
  userDescription: string;
  // Direction passed to the LLM when it writes the Runway prompt
  promptDirective: string;
}

export const VIDEO_STYLES: VideoStyleDef[] = [
  {
    key: "product_spotlight",
    label: "Product spotlight",
    blurb: "Cinematic camera orbit",
    userDescription:
      "Slow camera orbit around your product with soft studio lighting catching the surfaces. Versatile and works for almost any product.",
    promptDirective:
      "Slow, smooth camera orbit around the product. Soft, diffused studio lighting picks up surface textures. Subtle rack focus. The product stays centered and identifiable.",
  },
  {
    key: "spin_360",
    label: "360° spin",
    blurb: "Like an e-commerce listing",
    userDescription:
      "A clean turntable-style 360° rotation of your product on a neutral background. The same look luxury watch and jewelry sites use.",
    promptDirective:
      "True 360-degree turntable rotation. Locked-off camera, product rotating slowly on its vertical axis. Even, neutral lighting. Background blurred or seamless. Product fully visible at all times.",
  },
  {
    key: "cinematic_closeup",
    label: "Cinematic close-up",
    blurb: "Premium, dramatic feel",
    userDescription:
      "Slow push-in with dramatic lighting and shallow depth of field. A premium, editorial feel — think a luxury brand campaign.",
    promptDirective:
      "Slow cinematic push-in toward the product. Dramatic, low-key lighting with strong rim light and shallow depth of field. Subtle parallax reveals texture and craftsmanship. Product stays sharp, background softly blurred.",
  },
  {
    key: "lifestyle_motion",
    label: "Lifestyle motion",
    blurb: "Subtle ambient animation",
    userDescription:
      "Gentle ambient motion around your product — steam rising, fabric ruffling, light shifting — to bring the still photo to life without changing the scene.",
    promptDirective:
      "Subtle ambient animation around the product as photographed. Things like steam, gentle particles, soft light shifts, slight fabric or leaf movement. Camera nearly still. No new objects or people introduced. The original photo composition stays intact.",
  },
];

export const DEFAULT_VIDEO_STYLE: VideoStyleKey = "product_spotlight";

export function getStyleDef(key: VideoStyleKey | string | undefined): VideoStyleDef {
  return VIDEO_STYLES.find((s) => s.key === key) ?? VIDEO_STYLES[0];
}
