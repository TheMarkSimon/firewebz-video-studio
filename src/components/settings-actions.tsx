"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play } from "lucide-react";

export function SettingsActions() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string>("");

  function runTest(endpoint: string) {
    setResult("Running...");
    startTransition(async () => {
      try {
        const res = await fetch(endpoint, { method: "POST" });
        const json = await res.json();
        setResult(JSON.stringify(json, null, 2));
      } catch (e) {
        setResult(e instanceof Error ? e.message : String(e));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider tests</CardTitle>
        <CardDescription>Run a sample call to verify each provider.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button className="w-full justify-start" variant="outline" disabled={isPending} onClick={() => runTest("/api/test/llm")}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Test LLM provider
        </Button>
        <Button className="w-full justify-start" variant="outline" disabled={isPending} onClick={() => runTest("/api/test/video")}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Test video provider
        </Button>
        {result && (
          <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-secondary p-3 text-xs">{result}</pre>
        )}
      </CardContent>
    </Card>
  );
}
