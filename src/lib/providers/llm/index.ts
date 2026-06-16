import type { ConceptDraft, Platform, VideoStyle } from "@/lib/types";
import { mockLlm } from "./mock";
import { geminiLlm } from "./gemini";

export interface ConceptInput {
  businessName: string;
  businessCategory: string;
  brandTone: string[];
  targetAudience: string;
  goals: string[];
  productName: string;
  productDescription?: string;
  keyBenefit?: string;
  promotion?: string;
  price?: string;
  platform: Platform;
  videoStyle: VideoStyle | string;
  durationSeconds: number;
  ctaPreference?: string;
}

export interface LlmProvider {
  name: string;
  isConfigured(): boolean;
  generateConcept(input: ConceptInput): Promise<ConceptDraft>;
}

export function getLlmProvider(): LlmProvider {
  const selected = process.env.LLM_PROVIDER ?? "mock";
  if (selected === "gemini" && geminiLlm.isConfigured()) return geminiLlm;
  return mockLlm;
}

export function llmProviderStatus() {
  const selected = process.env.LLM_PROVIDER ?? "mock";
  const active = getLlmProvider();
  return {
    selected,
    activeName: active.name,
    geminiConfigured: geminiLlm.isConfigured(),
    fellBackToMock: selected === "gemini" && active.name === "mock",
  };
}
