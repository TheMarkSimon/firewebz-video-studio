export interface Mesh3dInput {
  frontImageDataUrl: string;
  backImageDataUrl?: string;
  leftImageDataUrl?: string;
  rightImageDataUrl?: string;
  caption?: string;
}

export interface Mesh3dResult {
  status: "completed" | "failed";
  glbUrl?: string;
  previewImageUrl?: string;
  providerJobId?: string;
  errorMessage?: string;
  durationMs?: number;
  modelUsed?: string;
  rawInput?: unknown;
}

export interface Mesh3dProvider {
  name: string;
  isConfigured(): boolean;
  generate(input: Mesh3dInput): Promise<Mesh3dResult>;
}
