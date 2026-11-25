"use client";

import { useEffect, useState } from "react";
import { useRouter } from "nextjs-toploader/app";
import { toast } from "sonner";
import { Plus, Search, Sparkles, Trash2 } from "lucide-react";
import type { CampaignCharacterRow } from "@/app/campaigns/character-actions";
import {
  QUICK_WEAPONS_5E,
  buildCalculatedWeaponRow,
  computeProficiencyBonus,
} from "@/lib/character-rules-calc";
import type {
  CharacterSheetPersonality,
  CharacterSheetSpell,
  CharacterSheetV1,
  CharacterSheetWeapon,
} from "@/lib/character-sheet";
import type { MobileCharacterOperation } from "@/lib/mobile-character-state";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

async function patchCharacterState(
  characterId: string,
  expectedUpdatedAt: string,
  operation: MobileCharacterOperation,
): Promise<{ ok: true } | { ok: false; conflict?: boolean; error: string }> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) return { ok: false, error: "Sessione scaduta: accedi di nuovo." };

  const res = await fetch(`/api/mobile/characters/${encodeURIComponent(characterId)}/state`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ expectedUpdatedAt, operation }),
  });
  if (res.status === 409) {
    return { ok: false, conflict: true, error: "La scheda è cambiata su un altro dispositivo. Ricarico i dati." };
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, error: body.error ?? "Salvataggio non riuscito." };
  }
  return { ok: true };
}

export function LongWeaponsSection({
  character,
  sheet,
  isLongCampaign,
}: {
  character: CampaignCharacterRow;
  sheet: CharacterSheetV1 | null;
  isLongCampaign: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [presetId, setPresetId] = useState(QUICK_WEAPONS_5E[4]!.id);
  const [proficient, setProficient] = useState(true);
  const [magic, setMagic] = useState("0");
  const [custom, setCustom] = useState<CharacterSheetWeapon>({ name: "", toHit: "", damage: "", type: "" });

  const weapons = sheet?.weaponRows ?? [];
  const pb = sheet?.proficiencyBonus ?? computeProficiencyBonus(character.level ?? 1);

  async function runOp(op: MobileCharacterOperation, msg: string) {
    setBusy(true);
    try {
      const res = await patchCharacterState(character.id, character.updated_at, op);
      if (!res.ok) {
        toast.error(res.error);
        if (res.conflict) router.refresh();
        return;
      }
      toast.success(msg);
      setOpenAdd(false);
      setCustom({ name: "", toHit: "", damage: "", type: "" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function applyPresetToCustom() {
    const preset = QUICK_WEAPONS_5E.find((w) => w.id === presetId);
    if (!preset) return;
    setCustom(
      buildCalculatedWeaponRow({
        name: preset.name,
        damageDie: preset.damageDie,
        versatileDie: preset.versatileDie,
        damageType: preset.damageType,
        mode: preset.mode,
        proficient,
        magicBonus: Number.parseInt(magic, 10) || 0,
        abilityMods: sheet?.abilityMods,
        proficiencyBonus: pb,
      }),
    );
  }

  return (
    <div className="space-y-3">
      {weapons.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="text-xs text-barber-paper/55">
              <tr>
                <th className="pb-2 pr-3">Arma</th>
                <th className="pb-2 pr-3">Attacco</th>
                <th className="pb-2 pr-3">Danno</th>
                <th className="pb-2">Tipo</th>
                {isLongCampaign ? <th className="pb-2 text-right">Azioni</th> : null}
              </tr>
            </thead>
            <tbody>
              {weapons.map((weapon, index) => (
                <tr key={`${weapon.name}-${index}`} className="border-t border-barber-gold/15">
                  <td className="py-2 pr-3 font-medium">{weapon.name}</td>
                  <td className="py-2 pr-3 tabular-nums text-barber-gold">{weapon.toHit}</td>
                  <td className="py-2 pr-3 tabular-nums">{weapon.damage}</td>
                  <td className="py-2">{weapon.type}</td>
                  {isLongCampaign ? (
                    <td className="py-2 text-right">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`Rimuovi ${weapon.name}`}
                        onClick={() => void runOp({ type: "removeWeapon", index }, "Arma rimossa.")}
                      >
                        <Trash2 className="h-4 w-4 text-barber-paper/70 hover:text-red-400" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm italic text-barber-paper/45">Non compilato</p>
      )}

      {isLongCampaign ? (
        <div>
          {!openAdd ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setOpenAdd(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Aggiungi arma / attacco
            </Button>
          ) : (
            <div className="space-y-3 rounded border border-barber-gold/25 bg-black/30 p-3">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1 space-y-1">
                  <Label className="text-xs">Precompila da catalogo D&D 5e</Label>
                  <select
                    value={presetId}
                    onChange={(e) => setPresetId(e.target.value)}
                    className="h-8 w-full rounded border border-barber-gold/30 bg-barber-dark px-2 text-xs text-barber-paper"
                  >
                    {QUICK_WEAPONS_5E.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.damageDie})
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex h-8 items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={proficient} onChange={(e) => setProficient(e.target.checked)} />
                  Competente
                </label>
                <select
                  value={magic}
                  onChange={(e) => setMagic(e.target.value)}
                  className="h-8 rounded border border-barber-gold/30 bg-barber-dark px-2 text-xs text-barber-paper"
                >
                  <option value="0">+0</option>
                  <option value="1">+1</option>
                  <option value="2">+2</option>
                  <option value="3">+3</option>
                </select>
                <Button type="button" size="sm" variant="outline" onClick={applyPresetToCustom}>
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  Calcola
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <Input placeholder="Nome arma" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" />
                <Input placeholder="TxC (es. +5)" value={custom.toHit} onChange={(e) => setCustom({ ...custom, toHit: e.target.value })} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" />
                <Input placeholder="Danno (es. 1d8+3)" value={custom.damage} onChange={(e) => setCustom({ ...custom, damage: e.target.value })} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" />
                <Input placeholder="Tipo (es. taglienti)" value={custom.type} onChange={(e) => setCustom({ ...custom, type: e.target.value })} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpenAdd(false)}>
                  Annulla
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !custom.name.trim()}
                  onClick={() => void runOp({ type: "upsertWeapon", weapon: custom }, "Arma aggiunta.")}
                >
                  Salva arma
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function LongSpellsListSection({
  character,
  sheet,
  isLongCampaign,
}: {
  character: CampaignCharacterRow;
  sheet: CharacterSheetV1 | null;
  isLongCampaign: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<CharacterSheetSpell & { sourceBook?: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<CharacterSheetSpell>({
    level: 0,
    name: "",
    summary: "",
    prepared: true,
  });

  const spells = sheet?.spells ?? [];

  async function runOp(op: MobileCharacterOperation, msg: string) {
    setBusy(true);
    try {
      const res = await patchCharacterState(character.id, character.updated_at, op);
      if (!res.ok) {
        toast.error(res.error);
        if (res.conflict) router.refresh();
        return;
      }
      toast.success(msg);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function searchCompendium() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/mobile/compendium/spells?q=${encodeURIComponent(query.trim())}`);
      const body = (await res.json().catch(() => ({}))) as { spells?: Array<CharacterSheetSpell & { sourceBook?: string }> };
      setResults(Array.isArray(body.spells) ? body.spells : []);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-3">
      {spells.length ? (
        <div className="space-y-2">
          {spells.map((spell, index) => {
            const spellFlags = [
              ["Rituale", spell.ritual],
              ["Concentrazione", spell.concentration],
              ["V", spell.verbal],
              ["S", spell.somatic],
              ["M", spell.material],
            ] as const;
            const knownFlags = spellFlags.filter(([, value]) => Boolean(value));
            return (
              <details key={`${spell.level}-${spell.name}-${index}`} className="rounded border border-barber-gold/15 px-3 py-2">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm font-medium">
                  <span>
                    {spell.name}{" "}
                    <span className="text-barber-paper/55">
                      · {spell.level === 0 ? "Trucchetto" : `Livello ${spell.level}`}
                    </span>
                    {spell.prepared ? <span className="ml-2 rounded bg-emerald-900/40 px-1.5 py-0.5 text-[11px] text-emerald-300">Preparato</span> : null}
                  </span>
                  {isLongCampaign ? (
                    <span className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
                      {spell.level > 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          disabled={busy}
                          onClick={() => void runOp({ type: "toggleSpellPrepared", index }, "Stato incantesimo aggiornato.")}
                        >
                          {spell.prepared ? "Rimuovi prep." : "Prepara"}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={busy}
                        onClick={() => void runOp({ type: "removeSpell", index }, "Incantesimo rimosso.")}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-barber-paper/65 hover:text-red-400" />
                      </Button>
                    </span>
                  ) : null}
                </summary>
                {spell.summary ? <p className="mt-2 whitespace-pre-wrap text-sm text-barber-paper/80">{spell.summary}</p> : null}
                {knownFlags.length ? (
                  <p className="mt-1 text-xs text-barber-gold">{knownFlags.map(([label]) => label).join(" · ")}</p>
                ) : null}
                {spell.fullTextMd ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-barber-paper/65">{spell.fullTextMd}</p>
                ) : null}
              </details>
            );
          })}
        </div>
      ) : (
        <p className="text-sm italic text-barber-paper/45">Non compilato</p>
      )}

      {isLongCampaign ? (
        <div>
          {!openAdd ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setOpenAdd(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Aggiungi incantesimo
            </Button>
          ) : (
            <div className="space-y-3 rounded border border-barber-gold/25 bg-black/30 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-barber-gold">Cerca dal Compendio (PHB / Xanathar / Tasha)</Label>
                <div className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void searchCompendium();
                      }
                    }}
                    placeholder="Cerca per nome…"
                    className="h-8 border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper"
                  />
                  <Button type="button" size="sm" variant="outline" disabled={searching} onClick={() => void searchCompendium()}>
                    <Search className="mr-1 h-3.5 w-3.5" />
                    Cerca
                  </Button>
                </div>
                {results.length > 0 ? (
                  <div className="max-h-40 space-y-1 overflow-y-auto pt-1">
                    {results.map((sp, i) => (
                      <div key={`${sp.name}-${i}`} className="flex items-center justify-between gap-2 rounded border border-barber-gold/15 bg-barber-dark/80 px-2 py-1 text-xs">
                        <span className="truncate">
                          <strong>{sp.name}</strong> ({sp.level === 0 ? "Trucchetto" : `${sp.level}°`})
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={busy}
                          onClick={() => {
                            const { sourceBook: _s, ...clean } = sp;
                            void runOp({ type: "upsertSpell", spell: { ...clean, prepared: true } }, `Aggiunto «${sp.name}».`);
                          }}
                        >
                          Aggiungi
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2 border-t border-barber-gold/15 pt-2">
                <Label className="text-xs">Oppure inserisci incantesimo dal cartaceo</Label>
                <div className="grid gap-2 sm:grid-cols-[1fr_6rem]">
                  <Input
                    placeholder="Nome incantesimo"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="h-8 border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={9}
                    value={draft.level}
                    onChange={(e) => setDraft({ ...draft, level: Math.max(0, Math.min(9, Number.parseInt(e.target.value || "0", 10) || 0)) })}
                    className="h-8 border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper"
                  />
                </div>
                <Textarea
                  rows={2}
                  placeholder="Effetto / gittata / durata"
                  value={draft.summary}
                  onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
                  className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setOpenAdd(false)}>
                    Chiudi
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || !draft.name.trim()}
                    onClick={async () => {
                      await runOp({ type: "upsertSpell", spell: draft }, "Incantesimo salvato.");
                      setDraft({ level: 0, name: "", summary: "", prepared: true });
                    }}
                  >
                    Salva manuale
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function LongInventoryEditorSection({
  character,
  items,
  isLongCampaign,
}: {
  character: CampaignCharacterRow;
  items?: string[];
  isLongCampaign: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState((items ?? []).join("\n"));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft((items ?? []).join("\n"));
  }, [items]);

  if (!isLongCampaign) {
    return items?.length ? (
      <ul className="list-inside list-disc space-y-1 text-sm text-barber-paper/90">
        {items.map((v, i) => (
          <li key={`${i}-${v}`}>{v}</li>
        ))}
      </ul>
    ) : (
      <span className="text-barber-paper/45 italic">Non compilato</span>
    );
  }

  return (
    <div className="space-y-2">
      {!editing ? (
        <>
          {items?.length ? (
            <ul className="list-inside list-disc space-y-1 text-sm text-barber-paper/90">
              {items.map((v, i) => (
                <li key={`${i}-${v}`}>{v}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm italic text-barber-paper/45">Zaino vuoto.</p>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Modifica zaino / oggetti
          </Button>
        </>
      ) : (
        <div className="space-y-2">
          <Textarea
            rows={6}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Un oggetto o consumabile per riga (es. 2x Pozione di guarigione, 20 frecce…)"
            className="border-barber-gold/30 bg-barber-dark/80 text-sm text-barber-paper"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annulla
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const list = draft.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
                  const res = await patchCharacterState(character.id, character.updated_at, { type: "updateInventory", items: list });
                  if (!res.ok) {
                    toast.error(res.error);
                    if (res.conflict) router.refresh();
                    return;
                  }
                  toast.success("Zaino aggiornato.");
                  setEditing(false);
                  router.refresh();
                } finally {
                  setBusy(false);
                }
              }}
            >
              Salva zaino
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LongBioNotesEditorSection({
  character,
  personality,
  playerNotes,
  isLongCampaign,
}: {
  character: CampaignCharacterRow;
  personality?: CharacterSheetPersonality;
  playerNotes?: string | null;
  isLongCampaign: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [traits, setTraits] = useState(personality?.traits ?? "");
  const [ideals, setIdeals] = useState(personality?.ideals ?? "");
  const [bonds, setBonds] = useState(personality?.bonds ?? "");
  const [flaws, setFlaws] = useState(personality?.flaws ?? "");
  const [notes, setNotes] = useState(playerNotes ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTraits(personality?.traits ?? "");
    setIdeals(personality?.ideals ?? "");
    setBonds(personality?.bonds ?? "");
    setFlaws(personality?.flaws ?? "");
    setNotes(playerNotes ?? "");
  }, [personality, playerNotes]);

  const hasAny = Boolean(traits || ideals || bonds || flaws || notes);

  if (!editing) {
    return (
      <div className="space-y-3">
        {hasAny ? (
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            {traits ? <div><p className="text-xs text-barber-gold">Tratti caratteriali</p><p className="whitespace-pre-wrap text-barber-paper/90">{traits}</p></div> : null}
            {ideals ? <div><p className="text-xs text-barber-gold">Ideali</p><p className="whitespace-pre-wrap text-barber-paper/90">{ideals}</p></div> : null}
            {bonds ? <div><p className="text-xs text-barber-gold">Legami</p><p className="whitespace-pre-wrap text-barber-paper/90">{bonds}</p></div> : null}
            {flaws ? <div><p className="text-xs text-barber-gold">Difetti</p><p className="whitespace-pre-wrap text-barber-paper/90">{flaws}</p></div> : null}
            {notes ? <div className="sm:col-span-2"><p className="text-xs text-barber-gold">Appunti del personaggio</p><p className="whitespace-pre-wrap text-barber-paper/90">{notes}</p></div> : null}
          </div>
        ) : (
          <p className="text-sm italic text-barber-paper/45">Nessun tratto caratteriale o appunto registrato.</p>
        )}
        {isLongCampaign ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Modifica personalità e appunti
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded border border-barber-gold/25 bg-black/25 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div><Label className="text-xs">Tratti caratteriali</Label><Textarea rows={2} value={traits} onChange={(e) => setTraits(e.target.value)} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" /></div>
        <div><Label className="text-xs">Ideali</Label><Textarea rows={2} value={ideals} onChange={(e) => setIdeals(e.target.value)} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" /></div>
        <div><Label className="text-xs">Legami</Label><Textarea rows={2} value={bonds} onChange={(e) => setBonds(e.target.value)} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" /></div>
        <div><Label className="text-xs">Difetti</Label><Textarea rows={2} value={flaws} onChange={(e) => setFlaws(e.target.value)} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" /></div>
        <div className="sm:col-span-2"><Label className="text-xs">Appunti di sessione del PG</Label><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="border-barber-gold/30 bg-barber-dark/80 text-xs text-barber-paper" /></div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
          Annulla
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await patchCharacterState(character.id, character.updated_at, {
                type: "updateBioNotes",
                personality: { traits, ideals, bonds, flaws },
                playerNotes: notes,
              });
              if (!res.ok) {
                toast.error(res.error);
                if (res.conflict) router.refresh();
                return;
              }
              toast.success("Personalità e appunti aggiornati.");
              setEditing(false);
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          Salva
        </Button>
      </div>
    </div>
  );
}
