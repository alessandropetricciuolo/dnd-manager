import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type ConsentPageProps = { searchParams: { authorization_id?: string } };

export default async function OAuthConsentPage({ searchParams }: ConsentPageProps) {
  const authorizationId = searchParams.authorization_id?.trim();
  if (!authorizationId || authorizationId.length > 512) return <ConsentError message="La richiesta di autorizzazione non è valida." />;

  const supabase = await createSupabaseServerClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) redirect(`/login?redirect=${encodeURIComponent(`/oauth/consent?authorization_id=${authorizationId}`)}`);

  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !data) return <ConsentError message="Questa richiesta è scaduta, non è valida o non è più disponibile." />;
  if (!("authorization_id" in data)) redirect(data.redirect_url);

  const scopes = data.scope.trim().split(/\s+/).filter(Boolean);
  return (
    <main className="flex min-h-screen items-center justify-center bg-barber-dark p-4">
      <Card className="w-full max-w-lg border-barber-gold/40 bg-barber-dark text-barber-paper shadow-[0_0_40px_rgba(251,191,36,0.12)]">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 text-barber-gold">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-[0.2em]">Barber & Dragons</span>
          </div>
          <CardTitle className="text-2xl">Autorizza un assistente AI</CardTitle>
          <p className="text-sm leading-6 text-barber-paper/80">
            <strong className="text-barber-paper">{data.client.name}</strong> chiede di collegarsi al tuo account B&D.
            Le azioni restano limitate al profilo Admin e alla campagna autorizzata.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-lg border border-barber-paper/15 bg-black/15 p-4">
            <p className="mb-2 font-medium text-barber-paper">Permessi richiesti</p>
            <ul className="list-disc space-y-1 pl-5 text-barber-paper/80">
              {scopes.length ? scopes.map((scope) => <li key={scope}>{scope}</li>) : <li>Accesso al tuo account B&D</li>}
            </ul>
          </div>
          <p className="text-xs leading-5 text-barber-paper/60">Non autorizzare client che non riconosci.</p>
        </CardContent>
        <CardFooter>
          <form action="/api/oauth/decision" method="post" className="flex w-full gap-3">
            <input type="hidden" name="authorization_id" value={authorizationId} />
            <Button name="decision" value="deny" type="submit" variant="outline" className="flex-1 border-barber-paper/30 bg-transparent text-barber-paper hover:bg-barber-paper/10 hover:text-barber-paper">Rifiuta</Button>
            <Button name="decision" value="approve" type="submit" className="flex-1 bg-barber-red text-barber-paper hover:bg-barber-red/90">Autorizza</Button>
          </form>
        </CardFooter>
      </Card>
    </main>
  );
}

function ConsentError({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-barber-dark p-4 text-barber-paper">
      <Card className="w-full max-w-md border-red-400/40 bg-barber-dark">
        <CardHeader><CardTitle>Autorizzazione non disponibile</CardTitle></CardHeader>
        <CardContent className="text-sm text-barber-paper/80">{message}</CardContent>
      </Card>
    </main>
  );
}
