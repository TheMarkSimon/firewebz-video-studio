import type { LlmProvider, ConceptInput } from ".";
import type { ConceptDraft } from "@/lib/types";

const HOOKS = [
  "Stop scrolling. This changes everything.",
  "The {product} hack nobody told you about.",
  "What if your day started with {product}?",
  "Three reasons everyone's talking about {product}.",
  "POV: you finally found the right {product}.",
];

const CAPTIONS = [
  "Meet the {product} your routine has been missing. Crafted for {audience}, made to last. ✨",
  "{benefit}. That's it. That's the post. Discover {product} today.",
  "We made {product} for {audience} who don't compromise. Try it and tell us what you think.",
];

const STYLE_TEMPLATES: Record<string, (i: ConceptInput) => string[]> = {
  "Product spotlight": (i) => [
    `Open with a bold text hook over a clean close-up of ${i.productName}.`,
    "Cut to a 360° style reveal with subtle motion blur.",
    `Show the key benefit: ${i.keyBenefit ?? "what makes it stand out"}.`,
    `Cut to a lifestyle moment that resonates with ${i.targetAudience}.`,
    `End with logo, product name, and CTA "${i.ctaPreference ?? "Shop now"}".`,
  ],
  "New arrival": (i) => [
    `Tease with "NEW" text card and motion-blurred reveal of ${i.productName}.`,
    "Slow pan across the product highlighting texture/finish.",
    `On-screen text: "Built for ${i.targetAudience}".`,
    "Quick montage of 2-3 use moments.",
    `Outro card with launch date and CTA "${i.ctaPreference ?? "Shop the drop"}".`,
  ],
  "Promo/discount": (i) => [
    `Bold typography reveal: "${i.promotion ?? "Limited time only"}".`,
    `Quick product showcase with ${i.productName} hero shot.`,
    `Stack key benefits as on-screen bullet text.`,
    "Urgency cue: countdown or 'while supplies last'.",
    `End with offer code and CTA "${i.ctaPreference ?? "Claim now"}".`,
  ],
};

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function fill(tpl: string, i: ConceptInput): string {
  return tpl
    .replaceAll("{product}", i.productName)
    .replaceAll("{audience}", i.targetAudience)
    .replaceAll("{benefit}", i.keyBenefit ?? "Real results");
}

export const mockLlm: LlmProvider = {
  name: "mock",
  isConfigured: () => true,
  async generateConcept(input) {
    const seed = Math.floor(Math.random() * 1000);
    const styleFn = STYLE_TEMPLATES[input.videoStyle] ?? STYLE_TEMPLATES["Product spotlight"];

    const draft: ConceptDraft = {
      title: `${input.videoStyle}: ${input.productName}`,
      hook: fill(pick(HOOKS, seed), input),
      storyboard: styleFn(input),
      onScreenText: [
        fill(pick(HOOKS, seed + 1), input),
        input.keyBenefit ?? "Made for real life.",
        "Easy to love.",
        input.ctaPreference ?? "Shop now.",
      ],
      voiceoverScript: `Meet ${input.productName} — ${input.keyBenefit ?? "made for the way you live"}. From ${input.businessName}.`,
      caption: fill(pick(CAPTIONS, seed + 2), input),
      hashtags: [
        "#SmallBusiness",
        `#${input.businessCategory.replace(/\s+/g, "")}`,
        `#${input.productName.replace(/\s+/g, "")}`,
        "#ShopLocal",
        "#ReelsDaily",
      ],
      cta: input.ctaPreference ?? "Shop now",
      performanceHypothesis: `This concept should resonate with ${input.targetAudience} because it leads with a hook tied to ${input.keyBenefit ?? "a clear benefit"} and gives viewers a low-friction next step.`,
    };
    return draft;
  },
};
