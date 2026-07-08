// Video provider interface for 360° turntable spin generation.
// One image in → one MP4 URL out. Providers implement this; the app never
// depends on a specific provider — the router in index.ts picks one.
// Moving to a new provider (Runway, Veo, Sora) is one new file.

export interface SpinVideoInput {
  imageUrl: string;      // fal.media URL or data URL of the bg-removed front photo
  // Optional extra angles (bg-removed URLs). Multi-image providers (Seedance
  // reference-to-video) use these to ground the unseen sides of the product;
  // single-image providers (Kling) ignore them.
  extraImageUrls?: string[];
  durationSeconds?: 5 | 10;
}

export interface SpinVideoResult {
  status: "completed" | "failed";
  videoUrl?: string;
  // WebP frames extracted from the MP4 for the canvas-flipbook scrubber.
  // Absent on failure to extract — client falls back to videoUrl scrubbing.
  frameUrls?: string[];
  providerJobId?: string;
  errorMessage?: string;
  durationMs?: number;
  modelUsed?: string;
  rawInput?: unknown;
}

// Result of submitting a job to a provider's async queue.
export interface SpinVideoSubmission {
  requestId?: string;
  errorMessage?: string;
}

export interface SpinVideoProvider {
  name: string;
  isConfigured(): boolean;
  generate(input: SpinVideoInput): Promise<SpinVideoResult>;
  // Async queue mode (Phase 3). Optional — providers without it fall back to
  // the blocking generate() path. `webhookUrl` is called by the provider when
  // the job finishes (only works from a public https origin).
  submit?(input: SpinVideoInput, opts?: { webhookUrl?: string }): Promise<SpinVideoSubmission>;
  // Fetch the outcome of a queued job. Returns null while the job is still
  // in queue / in progress; a terminal SpinVideoResult otherwise (frames
  // already extracted on success). Throws on transient errors (network) so
  // callers can retry on the next poll instead of marking the spin failed.
  fetchQueueResult?(requestId: string): Promise<SpinVideoResult | null>;
}
