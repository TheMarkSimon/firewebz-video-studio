"use server";

// Server-side background removal via Replicate (rembg). Runs in ~2-5 seconds
// per image, costs ~$0.001. Called from the photo-upload step in onboarding.

export interface RemoveBgResult {
  status: "completed" | "failed";
  cleanedDataUrl?: string;
  errorMessage?: string;
  durationMs?: number;
}

export async function removeBackgroundServerSide(imageDataUrl: string): Promise<RemoveBgResult> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return { status: "failed", errorMessage: "REPLICATE_API_TOKEN is not set" };
  }
  if (!imageDataUrl?.startsWith("data:")) {
    return { status: "failed", errorMessage: "Expected a data URL" };
  }

  const started = Date.now();
  try {
    const { default: Replicate } = await import("replicate");
    const replicate = new Replicate({ auth: token });

    // 851-labs/background-remover is fast (~2-5s), accepts data URLs directly,
    // returns a PNG with transparent background.
    const model = "851-labs/background-remover";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output: any = await replicate.run(model as `${string}/${string}`, {
      input: { image: imageDataUrl },
    });

    // Normalize output: can be a URL string, an array with a URL, or a
    // FileOutput object with .url() and .blob() methods.
    let url: string | undefined;
    if (typeof output === "string") {
      url = output;
    } else if (Array.isArray(output) && typeof output[0] === "string") {
      url = output[0];
    } else if (output && typeof output.url === "function") {
      const u = output.url();
      url = typeof u === "string" ? u : u?.href;
    } else if (Array.isArray(output) && output[0] && typeof output[0].url === "function") {
      const u = output[0].url();
      url = typeof u === "string" ? u : u?.href;
    }

    if (!url) {
      return {
        status: "failed",
        errorMessage: `Unexpected Replicate output shape: ${JSON.stringify(output).slice(0, 400)}`,
        durationMs: Date.now() - started,
      };
    }

    // Fetch the cleaned image and re-encode as data URL so the client can
    // display it without a follow-up round-trip.
    const res = await fetch(url);
    if (!res.ok) {
      return {
        status: "failed",
        errorMessage: `Failed to download cleaned image: HTTP ${res.status}`,
        durationMs: Date.now() - started,
      };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/png";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    return {
      status: "completed",
      cleanedDataUrl: dataUrl,
      durationMs: Date.now() - started,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { status: "failed", errorMessage: msg, durationMs: Date.now() - started };
  }
}
