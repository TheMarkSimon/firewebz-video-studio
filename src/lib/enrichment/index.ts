import { enrichFromWebsite, type WebsiteEnrichment } from "./website";
import { enrichFromSocial, type SocialEnrichment } from "./social";
import { describeImageWithVision, type VisionDescription } from "./vision";

export interface EnrichedBrief {
  business: {
    name: string;
    category: string;
    brandTone: string[];
    websiteUrl?: string;
    instagramUrl?: string;
    tiktokUrl?: string;
  };
  website: WebsiteEnrichment | null;
  instagram: SocialEnrichment | null;
  tiktok: SocialEnrichment | null;
  vision: VisionDescription | null;
  productImagePath?: string;
}

export interface EnrichmentInput {
  businessName: string;
  category: string;
  brandTone: string[];
  websiteUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  productImagePath?: string; // absolute path
}

export async function buildEnrichedBrief(input: EnrichmentInput): Promise<EnrichedBrief> {
  // Fan out: website, IG, TikTok, vision — all run concurrently
  const [website, instagram, tiktok, vision] = await Promise.all([
    enrichFromWebsite(input.websiteUrl ?? null),
    enrichFromSocial(input.instagramUrl ?? null),
    enrichFromSocial(input.tiktokUrl ?? null),
    input.productImagePath ? describeImageWithVision(input.productImagePath) : Promise.resolve(null),
  ]);

  return {
    business: {
      name: input.businessName,
      category: input.category,
      brandTone: input.brandTone,
      websiteUrl: input.websiteUrl,
      instagramUrl: input.instagramUrl,
      tiktokUrl: input.tiktokUrl,
    },
    website,
    instagram,
    tiktok,
    vision,
    productImagePath: input.productImagePath,
  };
}

export function briefToContextString(brief: EnrichedBrief): string {
  const parts: string[] = [];

  parts.push(`Business: ${brief.business.name}`);
  parts.push(`Category: ${brief.business.category}`);
  if (brief.business.brandTone.length) parts.push(`Brand tone: ${brief.business.brandTone.join(", ")}`);

  if (brief.website?.title) parts.push(`Website title: ${brief.website.title}`);
  if (brief.website?.description) parts.push(`Website description: ${brief.website.description}`);
  if (brief.website?.bodyText) parts.push(`Website excerpt: ${brief.website.bodyText.slice(0, 800)}`);

  if (brief.instagram?.bio) parts.push(`Instagram bio: ${brief.instagram.bio}`);
  if (brief.instagram?.handle) parts.push(`Instagram handle: ${brief.instagram.handle}`);
  if (brief.tiktok?.bio) parts.push(`TikTok bio: ${brief.tiktok.bio}`);
  if (brief.tiktok?.handle) parts.push(`TikTok handle: ${brief.tiktok.handle}`);

  if (brief.vision?.productGuess) parts.push(`Product (from photo): ${brief.vision.productGuess}`);
  if (brief.vision?.description) parts.push(`Photo description: ${brief.vision.description}`);
  if (brief.vision?.dominantColors) parts.push(`Colors: ${brief.vision.dominantColors}`);
  if (brief.vision?.setting) parts.push(`Photo setting: ${brief.vision.setting}`);

  return parts.join("\n");
}
