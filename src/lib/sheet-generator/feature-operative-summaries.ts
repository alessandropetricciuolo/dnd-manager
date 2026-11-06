import type { AbilityKey, GeneratedCharacterSheet } from './types';
import type { PrintFeature } from './manual-feature-text';

export interface OperativeFeatureItem {
  title: string;
  body: string;
  level: number;
}

const sign = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const ABILITY_IT: Record<AbilityKey, string> = {
  str: 'Forza',
  dex: 'Destrezza',
  con: 'Costituzione',
  int: 'Intelligenza',
  wis: 'Saggezza',
  cha: 'Carisma',
};

/** Canonical key for matching feature titles across reference cards and manual headings. */
export function canonicalFeatureKey(rawTitle: string): string {
  const base = rawTitle
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[:\-–—].*$/, '') // strip suffix after colon/dash e.g. "STILE DI COMBATTIMENTO - Duellare" -> "stile di combattimento"
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const aliases: Record<string, string> = {
    'invenzione magica': 'inventore arcano',
    'inventore magico': 'inventore arcano',
    'infondere un oggetto': 'infondere oggetto',
    'lo strumento piu adatto': 'il ferro del mestiere appropriato',
    'lo strumento giusto per il lavoro': 'il ferro del mestiere appropriato',
    'maestria negli strumenti': 'maestria degli strumenti',
    'prontezza al combattimento': 'pronto per la battaglia',
    'oggetto che custodisce l incante simo': 'oggetto accumula incantesimi',
    'oggetto che custodisce l incantesimo': 'oggetto accumula incantesimi',
    'difesa senz armatura': 'difesa senza armatura',
    'difesa senz armi': 'difesa senza armatura',
    'movimento senz armatura': 'movimento senza armatura',
    'movimento senz armi': 'movimento senza armatura',
    'canzone di riposo': 'canto di riposo',
    'controammaliamento': 'controfascino',
    'passo sul terreno': 'andatura sul territorio',
    'passo senz traccia': 'andatura sul territorio',
    'incanalare divinita scacciare non morti': 'incanalare divinita',
    'scacciare non morti': 'incanalare divinita',
  };

  return aliases[base] ?? base;
}

/** Pure umbrella / meta headings or stat-table headings already represented in dedicated sheet boxes. */
const UMBRELLA_FEATURE_KEYS = new Set([
  'aumento dei punteggi di caratteristica',
  'incremento dei punteggi di caratteristica',
  'archetipo marziale',
  'tradizione monastica',
  'cammino primordiale',
  'collegio bardico',
  'dominio divino',
  'circolo druidico',
  'giuramento sacro',
  'archetipo ladresco',
  'archetipo ranger',
  'archetipo del ranger',
  'tradizione arcana',
  'origine stregonesca',
  'patrono ultraterreno',
  'specialista artefice',
  'specialisti artefici',
  'specializzazione da artefice',
  'strumenti necessari',
  'trucchetti',
  'preparare e lanciare incantesimi',
  'caratteristica da incantatore',
  'celebrare rituali',
  'infondere negli oggetti',
  'infusioni conosciute',
  'competenza negli strumenti',
  'strumenti del mestiere',
  'infusioni artefice',
  'infusioni dell artefice',
  'infusioni e oggetti assegnati',
  'lista degli incantesimi ampliata',
  'incantesimi di dominio',
  'incantesimi del dominio',
  'incantesimi di giuramento',
  'incantesimi del giuramento',
]);

export function isUmbrellaOrRedundantFeature(title: string, classLabel: string): boolean {
  const key = canonicalFeatureKey(title);
  if (UMBRELLA_FEATURE_KEYS.has(key)) return true;
  if (/^incantesimi da /.test(key)) return true;
  // Pure "INCANTESIMI" header for classes whose spellcasting rules are shown on the Spells pages,
  // EXCEPT Wizard (spellbook copying/ritual rules) and Druid/Bard/Cleric ritual casting note handled below.
  if (key === 'incantesimi' && !['Mago', 'Druido', 'Chierico', 'Bardo'].includes(classLabel)) {
    return true;
  }
  return false;
}

/** Companion features whose full calculated stat block is printed in the dedicated Companions section. */
export function isCompanionStatBlockFeature(title: string): boolean {
  const norm = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return (
    norm === 'difensore d acciaio' ||
    norm === 'cannone occulto' ||
    norm === 'cannone eldritch' ||
    norm === 'compagno del ranger' ||
    norm === 'compagno animale' ||
    norm === 'compagno primordiale'
  );
}

/**
 * Strips manual extraction artifacts (chapter/page headers & footers, isolated page numbers, scanner and image tags)
 * without eliminating gameplay numbers such as damage dice, ranges, costs, DCs, durations and levels.
 */
export function stripManualArtifacts(text: string): string {
  return text
    // Chapter / Part headers or footers with or without page numbers (e.g. "116 CAPITOLO 3 | CLASSI", "CAPITOLO 2 | RAZZE 45")
    .replace(/(?:^|\n)\s*(?:\d{1,3}\s+)?(?:CAPITOLO|PARTE)\s+\d+(?:\s*\|[^\n]*)?(?:\s+\d{1,3})?/gi, ' ')
    .replace(/\b\d{1,3}\s+(?:CAPITOLO|PARTE)\s+\d+\s*\|[^\n]*/gi, ' ')
    .replace(/\b(?:CAPITOLO|PARTE)\s+\d+\s*\|[^\n]*/gi, ' ')
    // Isolated page numbers on their own line in multi-line text (e.g. "\n116\n")
    .replace(/\n\s*\d{1,3}\s*\n/g, '\n')
    // Scanner, donation or image artifacts
    .replace(/<page_header>[\s\S]*?<\/page_header>/gi, '')
    .replace(/^(?:img[-_]?\d+\.?\s*(?:jpe?g|png)?|scansionato con camscanner|offrimi un caff[eè][^\n]*|paypal\.me[^\n]*)\s*$/gim, '')
    // Clean up multiple spaces and empty lines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

/** Strips LaTeX ordinals, markdown formatting, progression tables, and future-level sentences (> level). */
export function cleanAndFilterManualFeatureBody(rawBody: string, level: number): string {
  const currentDie = level >= 17 ? 'd12' : level >= 11 ? 'd10' : level >= 5 ? 'd8' : 'd6';
  let text = stripManualArtifacts(rawBody)
    // Convert LaTeX ordinals like $1^{\circ}$ or $10^\circ$ to 1°, 10°
    .replace(/\$(\d+)\^\{\\circ\}\$/g, '$1°')
    .replace(/\$(\d+)\^\\circ\$/g, '$1°')
    // Resolve OCR corruption like "dō" or "d?" into current progression die
    .replace(/\bd[ō\?](?=\W|$)/gi, currentDie)
    // Remove markdown headings inside body
    .replace(/^#{1,6}\s+[^\n]+$/gm, '')
    // Remove markdown pipe tables (progression/spell tables already resolved in model)
    .replace(/^\s*\|[^\n]+\|\s*$/gm, '')
    // Strip bold/italic markers while keeping inner text
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1');

  // Filter out sentences that explicitly describe future-level unlocks (> current character level)
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const filteredParagraphs: string[] = [];
  for (const para of paragraphs) {
    // Split on sentence boundaries while keeping punctuation
    const sentences = para.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [para];
    const kept: string[] = [];
    for (const rawSent of sentences) {
      const sent = rawSent.trim();
      if (!sent) continue;
      // Check if sentence starts with an explicit level gate > current level
      const gateMatch = sent.match(
        /^(?:Inoltre,\s*|In aggiunta,\s*)?(?:al|dal|all['’]|dall['’]|a partire dal|quando raggiung[ei] il)\s+(\d+)[°º]?\s*livello\b/i
      );
      if (gateMatch) {
        const reqLvl = parseInt(gateMatch[1], 10);
        if (Number.isFinite(reqLvl) && reqLvl > level) {
          continue;
        }
      }
      // Also strip trailing future scaling clauses like "Questo dado cambia man mano che sali di livello..."
      if (/man mano che (?:sali|acquisisci) livelli|come mostrato nella colonna/i.test(sent)) {
        continue;
      }
      kept.push(sent);
    }
    if (kept.length > 0) {
      filteredParagraphs.push(kept.join(' '));
    }
  }

  return filteredParagraphs.join('\n');
}

function formatTitleCase(title: string): string {
  const trimmed = title.trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  const minor = new Set(['di', 'del', 'della', 'dei', 'degli', 'delle', 'da', 'dal', 'dalla', 'in', 'nel', 'nella', 'su', 'sul', 'sulla', 'per', 'con', 'e', 'o', 'a', 'al', 'alla', 'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una']);
  return trimmed
    .toLowerCase()
    .split(/(\s+|['’\-/:])/)
    .map((tok, idx) => {
      if (!tok || /^(\s+|['’\-/:])$/.test(tok)) return tok;
      if (idx > 0 && minor.has(tok)) return tok;
      return tok.charAt(0).toUpperCase() + tok.slice(1);
    })
    .join('');
}

/**
 * Converts a resolved `PrintFeature` from `model.features` (already level-gated and subclass/choice-resolved)
 * into a concise, verified operative entry without omitting conditions, triggers, costs, ranges, or recoveries.
 */
export function summarizeResolvedFeature(
  feature: PrintFeature,
  sheet: GeneratedCharacterSheet
): OperativeFeatureItem | null {
  const lvl = sheet.level;
  if (feature.level > lvl) return null;
  if (isUmbrellaOrRedundantFeature(feature.title, sheet.classLabel)) return null;

  if (isCompanionStatBlockFeature(feature.title)) {
    // Full stat block, actions, reactions and command rules are printed in the dedicated Companion section
    return null;
  }

  const key = canonicalFeatureKey(feature.title);
  const mods = sheet.abilityMods;
  const pb = sheet.proficiencyBonus;

  // Verified parameterized summaries for core class features (preserving all conditions & recoveries, zero future-level leaks)
  switch (key) {
    // --- ARTEFICE ---
    case 'inventore arcano':
      return {
        title: 'Inventore Arcano',
        level: feature.level,
        body: `Azione: tocchi un oggetto non magico Minuscolo e gli conferisci 1 proprietà (luce 1,5 m + 1,5 m fioca; messaggio registrato di 6 s udibile a 3 m al tocco; odore o suono costante a 3 m; immagine o testo statico max 25 parole). Max ${Math.max(1, mods.int)} oggetti attivi contemporaneamente.`,
      };
    case 'infondere oggetto': {
      const itemLim = sheet.artificer?.itemLimit ?? (lvl >= 18 ? 6 : lvl >= 14 ? 5 : lvl >= 10 ? 4 : lvl >= 6 ? 3 : 2);
      const daysAfterDeath = Math.max(1, mods.int);
      return {
        title: 'Infondere Oggetto',
        level: feature.level,
        body: `Fine riposo lungo: infondi oggetti non magici toccati con infusioni note (1 infusione per oggetto; ciascuna infusione in 1 solo oggetto; max ${itemLim} oggetti infusi attivi, se superi il limite la più vecchia termina). Sintonia istantanea facoltativa al momento dell'infusione. Dura a tempo indeterminato; se muori svanisce dopo ${daysAfterDeath} giorni (mod INT, min 1), o se sostituisci la conoscenza dell'infusione.`,
      };
    }
    case 'il ferro del mestiere appropriato':
      return {
        title: 'Il Ferro del Mestiere Appropriato',
        level: feature.level,
        body: 'Con arnesi da scasso o strumenti da artigiano in mano e 1 ora di lavoro ininterrotto (anche durante riposo breve o lungo), crei magicamente 1 set di strumenti da artigiano non magico in uno spazio libero entro 1,5 m; svanisce se riusi questo privilegio.',
      };
    case 'maestria degli strumenti':
      return {
        title: 'Maestria degli Strumenti',
        level: feature.level,
        body: 'Il tuo bonus di competenza raddoppia per ogni prova di caratteristica effettuata usando la competenza in uno strumento che possiedi.',
      };
    case 'lampo di genio':
      return {
        title: 'Lampo di Genio',
        level: feature.level,
        body: `Reazione: quando tu o un'altra creatura visibile entro 9 m effettuate una prova di caratteristica o un TS, aggiungi ${sign(mods.int)} (mod INT) al tiro. Usi: ${Math.max(1, mods.int)} per riposo lungo.`,
      };

    // --- MONACO ---
    case 'difesa senza armatura':
      if (sheet.classLabel === 'Monaco') {
        return {
          title: 'Difesa Senza Armatura',
          level: feature.level,
          body: `Finché non indossi armature né impugni uno scudo, la tua CA è 10 + mod DES + mod SAG (${10 + mods.dex + mods.wis}).`,
        };
      }
      if (sheet.classLabel === 'Barbaro') {
        return {
          title: 'Difesa Senza Armatura',
          level: feature.level,
          body: `Finché non indossi armature, la tua CA è 10 + mod DES + mod COS (${10 + mods.dex + mods.con}); puoi usare uno scudo.`,
        };
      }
      break;
    case 'arti marziali': {
      const maDie = lvl >= 17 ? '1d10' : lvl >= 11 ? '1d8' : lvl >= 5 ? '1d6' : '1d4';
      return {
        title: 'Arti Marziali',
        level: feature.level,
        body: `Senz'armatura e senza scudo, con colpi senz'armi e armi da monaco (semplici da mischia non pesanti/a due mani, spade corte): usi DES invece di FOR per TpC e danni, tiri ${maDie} al posto del danno normale, e quando usi l'azione di Attacco con colpo senz'armi o arma da monaco puoi effettuare 1 colpo senz'armi come azione bonus.`,
      };
    }
    case 'ki': {
      const kiDc = 8 + pb + mods.wis;
      return {
        title: 'Ki e Discipline',
        level: feature.level,
        body: `Punti Ki: ${lvl} (recupero dopo riposo breve o lungo con almeno 30 min di meditazione). CD TS Ki: ${kiDc}.\n• Raffica di Colpi (1 Ki): subito dopo l'azione di Attacco, effettui 2 colpi senz'armi come azione bonus.\n• Difesa Paziente (1 Ki): effettui Schivata come azione bonus nel tuo turno.\n• Passo del Vento (1 Ki): effettui Disimpegno o Scatto come azione bonus nel tuo turno e raddoppi la distanza di salto per il turno.`,
      };
    }
    case 'movimento senza armatura': {
      const bonus = lvl >= 18 ? '9' : lvl >= 14 ? '7,5' : lvl >= 10 ? '6' : lvl >= 6 ? '4,5' : '3';
      const vertical =
        lvl >= 9
          ? ' Ti muovi inoltre lungo superfici verticali e attraverso liquidi nel tuo turno senza cadere durante il movimento.'
          : '';
      return {
        title: 'Movimento Senza Armatura',
        level: feature.level,
        body: `Finché non indossi armature né impugni uno scudo, la tua velocità aumenta di +${bonus} m (già inclusa).${vertical}`,
      };
    }
    case 'deviare proiettili':
      return {
        title: 'Deviare Proiettili',
        level: feature.level,
        body: `Reazione quando sei colpito da un attacco con arma a distanza: riduci i danni di 1d10 + ${mods.dex + lvl} (mod DES + liv. monaco). Se riduci i danni a 0 e il proiettile sta in una mano libera, puoi afferrarlo e spendere 1 punto Ki per rilanciarlo nella stessa reazione (gittata 6/18 m, competente, arma da monaco).`,
      };

    // --- GUERRIERO (solo se effettivamente presente in model.features!) ---
    case 'atleta straordinario': {
      const halfUp = Math.ceil(pb / 2);
      return {
        title: 'Atleta Straordinario',
        level: feature.level,
        body: `Aggiungi +${halfUp} (metà BC arrotondata per eccesso) a qualsiasi prova di FOR, DES o COS che non usi già il tuo BC. Salto in lungo con rincorsa aumenta di ${Math.max(0, mods.str)} piedi (0,3 m per punto di mod FOR).`,
      };
    }

    // --- CHIERICO / DRUIDO / BARDO / MAGO INCANTESIMI RITUALI ---
    case 'incantesimi': {
      if (sheet.classLabel === 'Mago') {
        return {
          title: 'Libro degli Incantesimi e Rituali',
          level: feature.level,
          body: `Prepari ${Math.max(1, mods.int + lvl)} incantesimi da mago dal tuo libro dopo ogni riposo lungo. Lancio Rituale: puoi lanciare come rituale (+10 min, senza slot) qualsiasi incantesimo da mago nel tuo libro con il tag rituale, anche se non è preparato. Copiare un incantesimo: 2 ore e 50 mo per livello.`,
        };
      }
      if (sheet.classLabel === 'Chierico') {
        return {
          title: 'Preparazione e Lancio Rituale',
          level: feature.level,
          body: `Prepari ${Math.max(1, mods.wis + lvl)} incantesimi da chierico dopo ogni riposo lungo (oltre agli incantesimi di dominio sempre preparati). Puoi lanciare come rituale un incantesimo da chierico preparato che abbia il tag rituale.`,
        };
      }
      if (sheet.classLabel === 'Druido') {
        return {
          title: 'Preparazione e Lancio Rituale',
          level: feature.level,
          body: `Prepari ${Math.max(1, mods.wis + lvl)} incantesimi da druido dopo ogni riposo lungo. Puoi lanciare come rituale un incantesimo da druido preparato che abbia il tag rituale. Non indossi armature o scudi fatti di metallo.`,
        };
      }
      if (sheet.classLabel === 'Bardo') {
        return {
          title: 'Lancio Rituale e Focus Musicale',
          level: feature.level,
          body: 'Puoi lanciare qualsiasi incantesimo da bardo che conosci come rituale se possiede il tag rituale. Puoi usare uno strumento musicale come focus da incantatore.',
        };
      }
      break;
    }

    // --- PALADINO ---
    case 'senso del divino':
      return {
        title: 'Senso del Divino',
        level: feature.level,
        body: `Azione: fino alla fine del tuo prossimo turno conosci la posizione di qualsiasi celestiale, immondo o non morto entro 18 m non dietro copertura totale, e la presenza di luoghi/oggetti consacrati o profanati entro 18 m. Usi: ${1 + Math.max(0, mods.cha)} (1 + mod CAR) per riposo lungo.`,
      };
    case 'imposizione delle mani':
      return {
        title: 'Imposizione delle Mani',
        level: feature.level,
        body: `Riserva curativa di ${lvl * 5} PF (si ricarica a riposo lungo). Azione: tocchi una creatura e ripristini PF fino al massimo rimasto, oppure spendi 5 PF per curare 1 malattia o neutralizzare 1 veleno. Nessun effetto su non morti e costrutti.`,
      };

    // --- BARDO ---
    case 'factotum': {
      const halfDown = Math.floor(pb / 2);
      return {
        title: 'Factotum',
        level: feature.level,
        body: `Aggiungi +${halfDown} (metà BC arrotondata per difetto) a qualsiasi prova di caratteristica che non includa già il tuo bonus di competenza (già calcolato su abilità e Iniziativa).`,
      };
    }

    // --- LADRO ---
    case 'attacco furtivo': {
      const dice = Math.ceil(lvl / 2);
      return {
        title: 'Attacco Furtivo',
        level: feature.level,
        body: `1 volta per turno infliggi ${dice}d6 danni extra a una creatura colpita con un'arma accurata o a distanza se hai vantaggio al TpC, oppure se un altro nemico del bersaglio (non inabile) è entro 1,5 m da esso e non hai svantaggio al TpC.`,
      };
    }
    case 'gergo ladresco':
      return {
        title: 'Gergo Ladresco',
        level: feature.level,
        body: 'Conosci il gergo segreto dei ladri: puoi nascondere messaggi in conversazioni normali (richiede 4 volte il tempo) e comprendere simboli segreti che segnalano pericoli, bottini o rifugi sicuri.',
      };
    case 'potere psionico': {
      const die = lvl >= 17 ? 'd12' : lvl >= 11 ? 'd10' : lvl >= 5 ? 'd8' : 'd6';
      const diceCount = 2 * pb;
      return {
        title: 'Potere Psionico',
        level: feature.level,
        body: `Riserva: ${diceCount} dadi ${die} (recuperi tutti i dadi a riposo lungo; come azione bonus recuperi 1 dado, 1 volta per riposo breve o lungo).\n• Abilità Psiconforzata: se fallisci una prova con un'abilità o strumento in cui sei competente, tiri 1 dado ${die} e lo aggiungi alla prova; spendi il dado solo se la prova ha successo.\n• Sussurri Psichici (Azione): colleghi telepaticamente fino a ${pb} creature visibili entro 1,5 km per un numero di ore pari al tiro di 1 dado ${die}. Il 1° utilizzo dopo un riposo lungo è GRATUITO; gli usi successivi spendono 1 dado di Energia Psionica.`,
      };
    }
    case 'lame psichiche': {
      const abToken = mods.dex >= mods.str ? 'DES' : 'FOR';
      return {
        title: 'Lame Psichiche',
        level: feature.level,
        body: `Azione di Attacco (mano libera): manifesti una lama psichica magica (arma semplice, accurata, lancio 18 m; infligge 1d6 + mod ${abToken} danni psichici; svanisce dopo l'attacco). Azione bonus (altra mano libera): subito dopo l'attacco con la prima lama, effettui un secondo attacco in mischia o a distanza con una seconda lama psichica (1d4 + mod ${abToken} danni psichici). Non consuma dadi psionici.`,
      };
    }
  }

  const cleaned = cleanAndFilterManualFeatureBody(feature.body, lvl);
  if (!cleaned) return null;

  return {
    title: formatTitleCase(feature.title),
    level: feature.level,
    body: cleaned,
  };
}

export { ABILITY_IT };
