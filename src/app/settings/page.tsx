import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { llmProviderStatus } from "@/lib/providers/llm";
import { videoProviderStatus } from "@/lib/providers/video";
import { SettingsActions } from "@/components/settings-actions";
import { existsSync } from "node:fs";
import path from "node:path";

export default async function SettingsPage() {
  const llm = llmProviderStatus();
  const video = videoProviderStatus();
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const uploadsPath = process.env.UPLOAD_DIR ?? "./storage/uploads";
  const generatedPath = process.env.GENERATED_VIDEO_DIR ?? "./storage/generated-videos";

  const checks = [
    { label: "App mode", value: process.env.APP_MODE ?? "local", ok: true },
    { label: "Database file", value: existsSync(dbPath) ? "ok" : "missing", ok: existsSync(dbPath) },
    { label: "Uploads folder", value: uploadsPath, ok: existsSync(path.resolve(process.cwd(), uploadsPath)) },
    { label: "Generated videos folder", value: generatedPath, ok: existsSync(path.resolve(process.cwd(), generatedPath)) },
    { label: "LLM provider (selected)", value: llm.selected, ok: true },
    { label: "LLM provider (active)", value: llm.activeName, ok: !llm.fellBackToMock },
    { label: "GEMINI_API_KEY", value: llm.geminiConfigured ? "set" : "missing", ok: llm.geminiConfigured },
    { label: "Video provider (selected)", value: video.selected, ok: true },
    { label: "Video provider (active)", value: video.activeName, ok: !video.fellBackToFallback },
    { label: "FFmpeg available", value: video.ffmpegConfigured ? "yes" : "no", ok: video.ffmpegConfigured },
    { label: "Runway key", value: video.runwayConfigured ? "set" : "missing", ok: video.runwayConfigured },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl pt-6 lg:pt-10">
      <div className="mb-10">
        <h1 className="font-display text-[40px] leading-[1.1] text-fw-text md:text-[48px]">Settings &amp; debug</h1>
        <p className="mt-2 text-[17px] text-fw-darkGray">Verify your providers and run quick tests.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border border-fw-border">
          <CardHeader>
            <CardTitle>Environment</CardTitle>
            <CardDescription>What the app sees right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between border-b border-fw-border/60 py-2">
                <span className="text-[14px] text-fw-darkGray">{c.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-fw-black">{c.value}</span>
                  <Badge variant={c.ok ? "success" : "warning"}>{c.ok ? "ok" : "needs setup"}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <SettingsActions />

        <Card className="border border-fw-border lg:col-span-2">
          <CardHeader>
            <CardTitle>Action required from you</CardTitle>
            <CardDescription>How to enable real AI video generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Setup title="Enable Gemini text generation (concepts, captions, hashtags)" steps={[
              "Visit https://aistudio.google.com/ and sign in.",
              "Create an API key.",
              "Add it to .env.local as GEMINI_API_KEY=...",
              "Set LLM_PROVIDER=gemini in .env.local.",
              "Restart `npm run dev`.",
              "Come back to this page and click \"Test LLM\".",
            ]} />
            <Setup title="Enable Gemini/Veo video generation" steps={[
              "Confirm your Google AI Studio account has Veo access (region + allowlist may apply).",
              "Use the same GEMINI_API_KEY from above.",
              "Set VIDEO_PROVIDER=gemini_veo in .env.local.",
              "Optionally set GEMINI_VEO_MODEL=veo-3.0-generate-001 (default).",
              "Restart `npm run dev` and click \"Test video provider\".",
              "If you see access errors, fall back to VIDEO_PROVIDER=mock or ffmpeg_template.",
            ]} />
          </CardContent>
        </Card>
      </div>
      </div>
    </AppShell>
  );
}

function Setup({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-[15px] bg-fw-page p-5">
      <div className="font-display text-[18px] leading-7 text-fw-black">{title}</div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[14px] text-fw-darkGray">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}
