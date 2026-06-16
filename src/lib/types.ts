export type Platform =
  | "instagram_reels"
  | "tiktok"
  | "youtube_shorts"
  | "facebook_reels";

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram_reels: "Instagram Reels",
  tiktok: "TikTok",
  youtube_shorts: "YouTube Shorts",
  facebook_reels: "Facebook Reels",
};

export const VIDEO_STYLES = [
  "Product spotlight",
  "New arrival",
  "Customer favorite",
  "Promo/discount",
  "Problem/solution",
  "Comparison",
  "Seasonal",
] as const;
export type VideoStyle = (typeof VIDEO_STYLES)[number];

export const BRAND_TONES = [
  "Friendly",
  "Bold",
  "Trendy",
  "Premium",
  "Local/community",
  "Playful",
  "Professional",
  "Minimal",
] as const;

export const BUSINESS_GOALS = [
  "Get more awareness",
  "Drive website visits",
  "Drive store visits",
  "Promote products",
  "Launch new arrivals",
  "Keep social media active",
  "Build trust with customers",
] as const;

export const REJECTION_REASONS = [
  "Looks too generic",
  "Product is not clear",
  "Wrong tone",
  "Not engaging enough",
  "Product details look inaccurate",
  "Too salesy",
  "Too AI-looking",
  "Caption is weak",
  "Not relevant to my audience",
  "Other",
] as const;

export interface ConceptDraft {
  title: string;
  hook: string;
  storyboard: string[];
  onScreenText: string[];
  voiceoverScript?: string;
  caption: string;
  hashtags: string[];
  cta: string;
  performanceHypothesis: string;
}
