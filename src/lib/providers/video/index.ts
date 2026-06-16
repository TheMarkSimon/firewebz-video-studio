import { mockVideo } from "./mock";
import { veoVideo } from "./veo";
import { runwayVideo } from "./runway";
import { ffmpegTemplateVideo } from "./ffmpeg-template";

export interface VideoGenerationInput {
  businessName: string;
  businessCategory: string;
  brandTone: string;
  targetAudience: string;
  productName: string;
  productDescription?: string;
  productImagePaths: string[]; // absolute paths on disk
  platform: "instagram_reels" | "tiktok" | "youtube_shorts" | "facebook_reels";
  videoStyle: string;
  hook: string;
  storyboard: string[];
  onScreenText: string[];
  cta: string;
  durationSeconds: number;
  aspectRatio: "9:16";
  /**
   * Optional LLM-built prompt. When set, providers should use this directly
   * instead of building their own from hook/storyboard/etc. This is the path
   * the enrichment pipeline takes — it produces a much richer, image-aware prompt.
   */
  overridePrompt?: string;
}

export interface VideoGenerationResult {
  provider: string;
  status: "completed" | "failed" | "processing";
  videoFilePath?: string;     // relative path under storage/generated-videos
  previewPath?: string;
  providerJobId?: string;
  errorMessage?: string;
  rawResponse?: unknown;
  durationSeconds?: number;
}

export interface VideoGenerationProvider {
  name: string;
  isConfigured(): boolean;
  generateVideo(input: VideoGenerationInput): Promise<VideoGenerationResult>;
}

const PROVIDERS: Record<string, VideoGenerationProvider> = {
  mock: mockVideo,
  ffmpeg_template: ffmpegTemplateVideo,
  gemini_veo: veoVideo,
  runway: runwayVideo,
};

export function getVideoProvider(): VideoGenerationProvider {
  const selected = process.env.VIDEO_PROVIDER ?? "mock";
  const provider = PROVIDERS[selected];
  if (provider && provider.isConfigured()) return provider;
  if (ffmpegTemplateVideo.isConfigured()) return ffmpegTemplateVideo;
  return mockVideo;
}

export function videoProviderStatus() {
  const selected = process.env.VIDEO_PROVIDER ?? "mock";
  const active = getVideoProvider();
  return {
    selected,
    activeName: active.name,
    geminiVeoConfigured: veoVideo.isConfigured(),
    runwayConfigured: runwayVideo.isConfigured(),
    ffmpegConfigured: ffmpegTemplateVideo.isConfigured(),
    fellBackToFallback: selected !== active.name,
  };
}
