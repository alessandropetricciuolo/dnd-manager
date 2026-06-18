import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageBenchmarkRunAction } from "../actions";
import { ImageBenchmarkRunClient } from "../image-benchmark-run-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { runId: string };
};

export default async function AdminImageBenchmarkRunPage({ params }: PageProps) {
  const loaded = await getImageBenchmarkRunAction(params.runId);
  if (!loaded.success) {
    if (loaded.message.includes("admin") || loaded.message.includes("autenticato")) {
      redirect("/dashboard");
    }
    notFound();
  }

  const run = loaded.run as { id: string; title: string };
  const campaign = loaded.campaign;

  return (
    <div className="p-4 py-8 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <Link href="/admin/image-benchmark">
          <Button variant="ghost" size="sm" className="text-barber-paper/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tutte le run
          </Button>
        </Link>
        <ImageBenchmarkRunClient
          runId={run.id}
          runTitle={run.title}
          campaignName={"name" in campaign ? campaign.name : undefined}
          campaignError={"error" in campaign ? campaign.error : undefined}
          prompts={loaded.prompts as Parameters<typeof ImageBenchmarkRunClient>[0]["prompts"]}
          results={loaded.results as Parameters<typeof ImageBenchmarkRunClient>[0]["results"]}
          scores={loaded.scores as Parameters<typeof ImageBenchmarkRunClient>[0]["scores"]}
          models={loaded.models}
        />
      </div>
    </div>
  );
}
