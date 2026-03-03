import ReactMarkdown from "react-markdown";
import { EntityContent } from "../entity-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Swords } from "lucide-react";
import { GmOnlySection } from "./gm-only-section";

type CombatStats = { hp?: string; ac?: string; cr?: string; attacks?: string };
type MonsterAttributes = { combat_stats?: CombatStats; loot?: string };

type MonsterViewProps = {
  name: string;
  body: string;
  attributes: MonsterAttributes | null;
  isGmOrAdmin?: boolean;
};

export function MonsterView({ name, body, attributes, isGmOrAdmin = false }: MonsterViewProps) {
  const attrs = attributes ?? {};
  const stats = attrs.combat_stats ?? {};
  const hasStats = !!(stats.hp?.trim() || stats.ac?.trim() || stats.cr?.trim());
  const attacks = stats.attacks?.trim();
  const loot = attrs.loot?.trim();

  return (
    <div className="space-y-8">
      {hasStats || attacks ? (
        <GmOnlySection isGmOrAdmin={isGmOrAdmin}>
          <div
            className="rounded-xl border-2 border-amber-800/80 bg-[#f4e4c1] px-6 py-5 text-slate-900 shadow-lg"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            <h2 className="border-b-2 border-slate-800 pb-2 text-xl font-bold tracking-wide">
              {name}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {stats.hp && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Punti vita
                  </span>
                  <p className="text-lg font-bold">{stats.hp}</p>
                </div>
              )}
              {stats.ac && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Classe armatura
                  </span>
                  <p className="text-lg font-bold">{stats.ac}</p>
                </div>
              )}
              {stats.cr && (
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Grado di sfida
                  </span>
                  <p className="text-lg font-bold">{stats.cr}</p>
                </div>
              )}
            </div>
            {attacks && (
              <div className="mt-4 border-t border-amber-900/30 pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Attacchi e azioni speciali
                </span>
                <div className="mt-1 whitespace-pre-wrap text-slate-800">{attacks}</div>
              </div>
            )}
            {body && (
              <div className="prose prose-sm mt-4 max-w-none border-t border-amber-900/30 pt-4 text-slate-800">
                <ReactMarkdown>{body}</ReactMarkdown>
              </div>
            )}
          </div>
        </GmOnlySection>
      ) : (
        <div className="rounded-xl border border-emerald-700/40 bg-slate-900/60 px-6 py-5">
          <h2 className="border-b border-emerald-700/40 pb-2 text-xl font-bold text-slate-100">
            {name}
          </h2>
          {body ? (
            <div className="prose prose-invert prose-sm mt-4 max-w-none">
              <ReactMarkdown>{body}</ReactMarkdown>
            </div>
          ) : (
            <p className="mt-4 text-slate-400 italic">Nessuna descrizione.</p>
          )}
        </div>
      )}

      {loot && (
        <GmOnlySection isGmOrAdmin={isGmOrAdmin}>
          <Card className="border-emerald-700/50 bg-slate-900/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-emerald-300">
                <Coins className="h-4 w-4" />
                Loot
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="whitespace-pre-wrap text-slate-300">{loot}</div>
            </CardContent>
          </Card>
        </GmOnlySection>
      )}
    </div>
  );
}
