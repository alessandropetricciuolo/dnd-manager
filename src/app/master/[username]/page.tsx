import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Swords, Theater, Skull, ArrowLeft, BookOpen } from "lucide-react";
import { IMAGE_BLUR_PLACEHOLDER } from "@/lib/utils";

const LETHALITY_COLORS: Record<string, string> = {
  Bassa: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  Media: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  Alta: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  Implacabile: "bg-red-600/30 text-red-200 border-red-500/50",
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export default async function MasterDossierPage({ params }: Props) {
  const { username: usernameParam } = await params;
  const usernameDecoded = decodeURIComponent(usernameParam).trim();
  if (!usernameDecoded) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, first_name, last_name, username, bio, portrait_url, is_gm_public, stat_combat, stat_roleplay, stat_lethality"
    )
    .eq("is_gm_public", true)
    .ilike("username", usernameDecoded)
    .maybeSingle();

  if (profileError || !profile) notFound();

  const displayName =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.display_name ||
    profile.username ||
    "Master";

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, description, image_url, created_at")
    .eq("gm_id", profile.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const lethalityClass =
    LETHALITY_COLORS[profile.stat_lethality] ||
    "bg-barber-gold/20 text-barber-gold border-barber-gold/40";

  return (
    <div className="min-h-screen bg-barber-dark text-barber-paper">
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-6">
          <Link href="/masters">
            <Button
              variant="ghost"
              size="sm"
              className="text-barber-paper/80 hover:text-barber-paper"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Albo dei Master
            </Button>
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Colonna sinistra: ritratto + nome */}
          <aside className="flex flex-col items-center md:items-start">
            <div className="relative w-full max-w-[240px] overflow-hidden rounded-xl border-2 border-barber-gold/40 bg-barber-dark/80 shadow-lg shadow-barber-gold/10 aspect-[3/4]">
              {profile.portrait_url ? (
                <Image
                  src={profile.portrait_url}
                  alt=""
                  fill
                  className="object-cover object-top"
                  sizes="240px"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-barber-gold/10 text-barber-gold/50">
                  <BookOpen className="h-16 w-16" />
                </div>
              )}
            </div>
            <h1 className="mt-4 text-center text-xl font-bold text-barber-gold md:text-left md:text-2xl">
              {displayName}
            </h1>
            {profile.username && (
              <p className="mt-1 text-sm text-barber-paper/60">@{profile.username}</p>
            )}
          </aside>

          {/* Colonna destra: statistiche, bio, campagne */}
          <div className="md:col-span-2 space-y-8">
            {/* Statistiche */}
            <section className="rounded-xl border border-barber-gold/30 bg-barber-dark/80 p-6 shadow-inner">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-barber-gold/90">
                Statistiche del Narratore
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-barber-paper/90">
                      <Swords className="h-4 w-4 text-barber-gold/80" />
                      Combattimento
                    </span>
                    <span className="font-medium text-barber-gold">{profile.stat_combat}</span>
                  </div>
                  <Progress value={profile.stat_combat} className="h-3" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-barber-paper/90">
                      <Theater className="h-4 w-4 text-barber-gold/80" />
                      Roleplay
                    </span>
                    <span className="font-medium text-barber-gold">{profile.stat_roleplay}</span>
                  </div>
                  <Progress value={profile.stat_roleplay} className="h-3" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Skull className="h-4 w-4 text-barber-gold/80" />
                  <span className="text-sm text-barber-paper/80">Mortalità</span>
                  <Badge
                    variant="outline"
                    className={`border ${lethalityClass}`}
                  >
                    {profile.stat_lethality}
                  </Badge>
                </div>
              </div>
            </section>

            {/* Bio */}
            {profile.bio && (
              <section className="rounded-xl border border-barber-gold/20 bg-barber-dark/60 p-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-barber-gold/90">
                  Bio
                </h2>
                <p className="whitespace-pre-wrap text-barber-paper/90 leading-relaxed">
                  {profile.bio}
                </p>
              </section>
            )}

            {/* Campagne pubbliche */}
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-barber-gold/90">
                Campagne attive
              </h2>
              {campaigns && campaigns.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {campaigns.map((c) => (
                    <Link key={c.id} href={`/campaigns/${c.id}`}>
                      <Card className="overflow-hidden border-barber-gold/30 bg-barber-dark/80 transition-colors hover:border-barber-gold/50 hover:bg-barber-dark/90">
                        <div className="relative aspect-[3/2] w-full bg-barber-dark">
                          <Image
                            src={c.image_url || "https://placehold.co/600x400/1c1917/fbbf24/png?text=Campagna"}
                            alt={c.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 50vw"
                            placeholder="blur"
                            blurDataURL={IMAGE_BLUR_PLACEHOLDER}
                            unoptimized={!!c.image_url}
                          />
                        </div>
                        <CardHeader className="pb-2">
                          <CardTitle className="line-clamp-1 text-base text-barber-paper">
                            {c.name}
                          </CardTitle>
                          {c.description && (
                            <p className="line-clamp-2 text-sm text-barber-paper/70">
                              {c.description}
                            </p>
                          )}
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-barber-gold/20 bg-barber-dark/60 px-4 py-6 text-center text-sm text-barber-paper/60">
                  Nessuna campagna pubblica al momento.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
