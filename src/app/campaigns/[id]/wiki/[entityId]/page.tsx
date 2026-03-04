import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { getEntity } from "@/app/campaigns/wiki-actions";
import { WikiDetails } from "@/components/wiki/wiki-details";
import { WikiEntityEditButton } from "@/components/wiki/wiki-entity-edit-button";
import { ArrowLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string; entityId: string }>;
};

export default async function WikiEntityPage({ params }: PageProps) {
  const { id: campaignId, entityId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const entity = await getEntity(entityId, campaignId);

  if (!entity) {
    notFound();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

  const contentBody =
    entity.content && typeof entity.content === "object" && "body" in entity.content
      ? String((entity.content as { body?: string }).body ?? "")
      : "";

  const entityWithDefaults = {
    ...entity,
    attributes: entity.attributes ?? {},
    sort_order: entity.sort_order ?? null,
  };

  const isLore = entity.type === "lore";
  const maxWidth = isLore ? "max-w-4xl" : "max-w-5xl";

  return (
    <div className="min-h-screen bg-barber-dark px-4 py-8">
      <div className={`mx-auto ${maxWidth}`}>
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link
            href={`/campaigns/${campaignId}?tab=wiki&wiki_filter=${encodeURIComponent(entity.type)}`}
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Indietro alla campagna
            </Button>
          </Link>
          {isGmOrAdmin && (
            <WikiEntityEditButton
              campaignId={campaignId}
              entity={entityWithDefaults}
              contentBody={contentBody}
            />
          )}
        </div>
        <article className="rounded-xl border border-barber-gold/40 bg-barber-dark/90 p-6 shadow-[0_0_40px_rgba(251,191,36,0.1)]">
          {entity.type !== "lore" && (
            <h1 className="mb-6 text-3xl font-bold tracking-tight text-barber-paper md:text-4xl">
              {entity.name}
            </h1>
          )}
          <WikiDetails entity={entityWithDefaults} contentBody={contentBody} isGmOrAdmin={isGmOrAdmin} />
        </article>
      </div>
    </div>
  );
}
