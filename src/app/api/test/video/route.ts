import { NextResponse } from "next/server";
import { getVideoProvider } from "@/lib/providers/video";
import fs from "node:fs/promises";
import path from "node:path";

// 1x1 magenta JPEG (smallest valid JPEG, ~125 bytes) — used as a placeholder image
// for the provider test when no real product photo exists yet.
const PLACEHOLDER_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAr/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKpgAAB//9k=";

export async function POST() {
  const provider = getVideoProvider();

  // Try to find a real uploaded photo; fall back to placeholder
  const uploadsDir = process.env.UPLOAD_DIR ?? "./storage/uploads";
  let testImagePath: string;
  try {
    const files = await fs.readdir(uploadsDir);
    const realImage = files.find((f) => /\.(jpe?g|png|webp)$/i.test(f));
    if (realImage) {
      testImagePath = path.resolve(uploadsDir, realImage);
    } else {
      throw new Error("no uploads");
    }
  } catch {
    const placeholderDir = path.resolve(uploadsDir);
    await fs.mkdir(placeholderDir, { recursive: true });
    const placeholderPath = path.resolve(placeholderDir, "_test-placeholder.jpg");
    try {
      await fs.access(placeholderPath);
    } catch {
      await fs.writeFile(placeholderPath, Buffer.from(PLACEHOLDER_JPEG_BASE64, "base64"));
    }
    testImagePath = placeholderPath;
  }

  try {
    const result = await provider.generateVideo({
      businessName: "Sample Bakery",
      businessCategory: "Bakery",
      brandTone: "Friendly",
      targetAudience: "local families",
      productName: "Chocolate Croissant",
      productDescription: "Flaky, buttery, filled with chocolate.",
      productImagePaths: [testImagePath],
      platform: "instagram_reels",
      videoStyle: "Product spotlight",
      hook: "Fresh from the oven.",
      storyboard: ["Close-up of croissant", "Steam rising", "Bite and reveal", "Logo"],
      onScreenText: ["Fresh.", "Daily.", "Visit us."],
      cta: "Visit us",
      durationSeconds: 5,
      aspectRatio: "9:16",
    });
    return NextResponse.json({ ok: true, providerName: provider.name, ...result });
  } catch (e) {
    return NextResponse.json({ ok: false, providerName: provider.name, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
