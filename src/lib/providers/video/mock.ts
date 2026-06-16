import type { VideoGenerationProvider } from ".";

export const mockVideo: VideoGenerationProvider = {
  name: "mock",
  isConfigured: () => true,
  async generateVideo(input) {
    // Simulate a short generation delay
    await new Promise((r) => setTimeout(r, 1200));
    return {
      provider: "mock",
      status: "completed",
      videoFilePath: undefined, // signals UI to render placeholder card
      durationSeconds: input.durationSeconds,
    };
  },
};
