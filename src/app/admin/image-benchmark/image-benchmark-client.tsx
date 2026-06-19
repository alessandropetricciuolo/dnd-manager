"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IMAGE_BENCHMARK_ASPECT_RATIOS,
  IMAGE_BENCHMARK_CATEGORIES,
  PRESET_BENCHMARK_PROMPTS,
} from "@/lib/image-benchmark/models";
import { SITE_IMAGE_MODEL } from "@/lib/ai/openrouter-image-preview";
import { createImageBenchmarkRunAction } from "./actions";

type RunRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

type PromptDraft = {
  category: string;
  prompt: string;
  aspectRatio: string;
};

type ImageBenchmarkClientProps = {
  runs: RunRow[];
};

const defaultPrompt = (): PromptDraft => ({
  category: IMAGE_BENCHMARK_CATEGORIES[0],
  prompt: "",
  aspectRatio: "1:1",
});

export function ImageBenchmarkClient({ runs }: ImageBenchmarkClientProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompts, setPrompts] = useState<PromptDraft[]>([defaultPrompt()]);
  const [creating, setCreating] = useState(false);

  function addPreset(presetId: string) {
    const preset = PRESET_BENCHMARK_PROMPTS.find((p) => p.id === presetId);
    if (!preset) return;
    setPrompts((prev) => {
      if (prev.length >= 10) return prev;
      return [
        ...prev,
        { category: preset.category, prompt: preset.prompt, aspectRatio: preset.aspectRatio },
      ];
    });
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const result = await createImageBenchmarkRunAction({
        title,
        description,
        prompts,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Benchmark run creata.");
      router.push(`/admin/image-benchmark/${result.runId}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="border-barber-gold/25 bg-barber-dark/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-barber-gold">
            <Plus className="h-5 w-5" />
            Nuova benchmark run
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Titolo</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Test modelli Q2 2026" />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Note opzionali"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prompt predefiniti</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_BENCHMARK_PROMPTS.map((p) => (
                <Button key={p.id} type="button" size="sm" variant="outline" onClick={() => addPreset(p.id)}>
                  + {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Prompt ({prompts.length}/10)</Label>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={prompts.length >= 10}
                onClick={() => setPrompts((p) => [...p, defaultPrompt()])}
              >
                Aggiungi prompt
              </Button>
            </div>
            {prompts.map((p, index) => (
              <div key={index} className="space-y-2 rounded-lg border border-barber-gold/20 p-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <Select
                    value={p.category}
                    onValueChange={(v) =>
                      setPrompts((rows) => rows.map((r, i) => (i === index ? { ...r, category: v } : r)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_BENCHMARK_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={p.aspectRatio}
                    onValueChange={(v) =>
                      setPrompts((rows) => rows.map((r, i) => (i === index ? { ...r, aspectRatio: v } : r)))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_BENCHMARK_ASPECT_RATIOS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={prompts.length <= 1}
                    onClick={() => setPrompts((rows) => rows.filter((_, i) => i !== index))}
                  >
                    Rimuovi
                  </Button>
                </div>
                <Textarea
                  value={p.prompt}
                  onChange={(e) =>
                    setPrompts((rows) => rows.map((r, i) => (i === index ? { ...r, prompt: e.target.value } : r)))
                  }
                  rows={3}
                  placeholder="Prompt immagine…"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-barber-paper/60">
            Modello: <code className="text-barber-gold">{SITE_IMAGE_MODEL}</code>
          </p>

          <Button
            type="button"
            className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            disabled={creating}
            onClick={handleCreate}
          >
            Crea run
          </Button>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-barber-paper">Run esistenti</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-barber-paper/60">Nessuna run ancora.</p>
        ) : (
          <div className="grid gap-3">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/admin/image-benchmark/${run.id}`}
                className="flex items-center justify-between rounded-lg border border-barber-gold/20 bg-barber-dark/60 px-4 py-3 transition hover:border-barber-gold/40"
              >
                <div>
                  <p className="font-medium text-barber-paper">{run.title}</p>
                  {run.description ? (
                    <p className="text-sm text-barber-paper/60">{run.description}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-barber-paper/50">
                  <ImageIcon className="h-4 w-4" />
                  {new Date(run.created_at).toLocaleString("it-IT")}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
