import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPopoutButton } from "@/components/maps/map-popout-button";
import { Coins } from "lucide-react";
import { GmOnlySection } from "./gm-only-section";
import { DualSourceImage } from "@/components/dual-source-image";

const PLACEHOLDER = "https://placehold.co/400x500/1e293b/8b5a2b/png?text=Mostro";

type CombatStats = { hp?: string; ac?: string; cr?: string; attacks?: string };
type MonsterAttributes = { combat_stats?: CombatStats; loot?: string };

type MonsterViewProps = {
  name: string;
  body: string;
  imageUrl: string | null;
  telegramFallbackId?: string | null;
  attributes: MonsterAttributes | null;
  isGmOrAdmin?: boolean;
};

export function MonsterView({
  name,
  body,
  imageUrl,
  telegramFallbackId,
  attributes,
  isGmOrAdmin = false,
}: MonsterViewProps) {
  const attrs = attributes ?? {};
  const stats = attrs.combat_stats ?? {};
  const hasStats = !!(stats.hp?.trim() || stats.ac?.trim() || stats.cr?.trim());
  const attacks = stats.attacks?.trim();
  const loot = attrs.loot?.trim();

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-barber-gold/30 bg-barber-dark">
            <DualSourceImage
              driveUrl={imageUrl ?? PLACEHOLDER}
              telegramFallbackId={telegramFallbackId ?? null}
              alt={name}
              className="h-full w-full object-cover"
            />
          </div>
          <MapPopoutButton
            imageUrl={imageUrl ?? PLACEHOLDER}
            title={name}
          />
        </div>
        <div className="min-w-0">
      {hasStats || attacks ? (
        <GmOnlySection isGmOrAdmin={isGmOrAdmin}>
          <div
            className="rounded-xl border-2 border-barber-gold/50 bg-barber-dark px-6 py-5 text-barber-paper shadow-lg"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            <h2 className="border-b-2 border-barber-gold/50 pb-2 text-xl font-bold tracking-wide text-barber-paper">
              {name}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 min-w-0">
              {stats.hp && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-barber-paper/70">
                    Punti vita
                  </span>
                  <p className="text-lg font-bold text-barber-paper">{stats.hp}</p>
                </div>
              )}
              {stats.ac && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-barber-paper/70">
                    Classe armatura
                  </span>
                  <p className="text-lg font-bold text-barber-paper">{stats.ac}</p>
                </div>
              )}
              {stats.cr && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-barber-paper/70">
                    Grado di sfida
                  </span>
                  <p className="text-lg font-bold text-barber-paper">{stats.cr}</p>
                </div>
              )}
            </div>
            {attacks && (
              <div className="mt-4 border-t border-barber-gold/30 pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-barber-paper/70">
                  Attacchi e azioni speciali
                </span>
                <div className="mt-1 whitespace-pre-wrap text-barber-paper">{attacks}</div>
              </div>
            )}
            {body && (
              <div className="prose prose-sm mt-4 max-w-none border-t border-barber-gold/30 pt-4 prose-p:text-barber-paper/90 prose-headings:text-barber-gold">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            )}
          </div>
        </GmOnlySection>
      ) : (
        <div className="rounded-xl border border-barber-gold/40 bg-barber-dark/80 px-6 py-5">
          <h2 className="border-b border-barber-gold/40 pb-2 text-xl font-bold text-barber-paper">
            {name}
          </h2>
          {body ? (
            <div className="prose prose-invert prose-sm mt-4 max-w-none prose-p:text-barber-paper/90 prose-headings:text-barber-gold">
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>
          ) : (
            <p className="mt-4 text-barber-paper/60 italic">Nessuna descrizione.</p>
          )}
        </div>
      )}
        </div>
      </div>

      {loot && (
        <GmOnlySection isGmOrAdmin={isGmOrAdmin}>
          <Card className="border-barber-gold/40 bg-barber-dark/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-barber-gold">
                <Coins className="h-4 w-4" />
                Loot
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="whitespace-pre-wrap text-barber-paper/80">{loot}</div>
            </CardContent>
          </Card>
        </GmOnlySection>
      )}
    </div>
  );
}
