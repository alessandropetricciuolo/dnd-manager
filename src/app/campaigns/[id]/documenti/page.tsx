import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequestAuthContext } from "@/utils/supabase/request-auth-context";
import { WIKI_ENTITY_LABELS_IT } from "@/lib/wiki/entity-types";

export default async function CampaignDocumentsPage({ params, searchParams }: { params: { id: string }; searchParams: { q?: string } }) {
  const { supabase, user, profile } = await getRequestAuthContext();
  if (!user || profile?.role !== "admin") notFound();
  const { data: campaign } = await supabase.from("campaigns").select("id,name").eq("id", params.id).maybeSingle();
  if (!campaign) notFound();
  const query = (searchParams.q ?? "").trim().slice(0, 200);
  let request = supabase.from("wiki_entities").select("id,name,type,archived_at")
    .eq("campaign_id", params.id).eq("is_campaign_document", true).order("name");
  const safeQuery = query.replace(new RegExp("[^\\p{L}\\p{N}\\s-]", "gu"), " ").trim();
  if (safeQuery) request = request.or(`name.ilike.%${safeQuery}%,content->>body.ilike.%${safeQuery}%`);
  const { data, error } = await request;
  return <main className="mx-auto max-w-5xl space-y-6 p-6 text-barber-paper">
    <Link href={`/campaigns/${params.id}?tab=wiki`} className="underline">Torna alla campagna</Link>
    <div><h1 className="text-2xl font-serif">Documenti di campagna</h1>
      <p className="mt-2 text-sm text-barber-paper/70">{campaign.name} · Solo Admin. Dossier e istruzioni separati dalla Wiki e dalle voci archiviate.</p></div>
    <form className="flex gap-2"><input name="q" defaultValue={query} placeholder="Cerca nei documenti" aria-label="Cerca nei documenti di campagna" className="flex-1 rounded border border-brass-base/40 bg-black/30 p-2" /><button className="rounded border border-brass-base/40 px-4">Cerca</button></form>
    {error ? <p>Documenti non disponibili. Verifica che la sezione sia stata attivata.</p> : <ul className="space-y-3">{(data ?? []).map(row => <li key={row.id} className="rounded border border-brass-base/30 p-4"><Link className="font-serif text-lg underline" href={`/campaigns/${params.id}/wiki/${row.id}`}>{row.name}</Link><p className="text-sm text-barber-paper/60">{WIKI_ENTITY_LABELS_IT[row.type as keyof typeof WIKI_ENTITY_LABELS_IT] ?? row.type}{row.archived_at ? " · Voce archiviata" : ""}</p></li>)}</ul>}
    {!error && !data?.length && <p>Nessun documento trovato. Puoi spostare qui una voce dalla sua pagina di dettaglio.</p>}
  </main>;
}
