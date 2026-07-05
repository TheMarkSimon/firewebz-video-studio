// Video provider interface for 360° turntable spin generation.
// One image in → one MP4 URL out. Providers implement this; the app never
// depends on a specific provider — the router in index.ts picks one.
// Moving to a new provider (Runway, Veo, Sora) is one new file.

export interface SpinVideoInput {
  imageUrl: string;      // fal.media URL or data URL of the bg-removed front photo
  durationSeconds?: 5 | 10;
}

export interface SpinVideoResult {
  status: "completed" | "failed";
  videoUrl?: string;
  providerJobId?: string;
  errorMessage?: string;
  durationMs?: number;
  modelUsed?: string;
  rawInput?: unknown;
}

export interface SpinVideoProvider {
  name: string;
  isConfigured(): boolean;
  generate(input: SpinVideoInput): Promise<SpinVideoResult>;
}
