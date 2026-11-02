import type { WarlockPactBoon } from './warlock-patrons';

export interface ReferenceCard {
  level: number;
  title: string;
  source: string;
  body: string;
}

export const WARLOCK_PACT_BOON_SUMMARIES: Record<WarlockPactBoon, string> = {
  'Patto della Catena':
    "Apprendi l'incantesimo Trova Famiglio e puoi lanciarlo come rituale (non conta nel numero di incantesimi conosciuti). Puoi scegliere una delle forme normali oppure una forma speciale: imp, pseudodrago, quasit o spiritello. Quando effettui l'azione di Attacco nel tuo turno, puoi rinunciare a uno dei tuoi attacchi per permettere al famiglio di effettuare un attacco con la propria reazione.",
  'Patto della Lama':
    "Puoi usare la tua azione per creare un'arma del patto da mischia nella tua mano vuota, scegliendone la forma ogni volta; sei competente con essa finché la impugni ed è considerata magica contro resistenze e immunità. Scompare se resta a più di 1,5 m da te per 1 minuto, se ne crei un'altra, se la congedi (nessuna azione) o se muori. Puoi trasformare un'arma magica nella tua arma del patto con un rituale di 1 ora.",
  'Patto del Tomo':
    "Il patrono ti dona un grimorio chiamato Libro delle Ombre. Quando ottieni questo privilegio, scegli 3 trucchetti dalla lista di qualsiasi classe (anche di liste diverse): mentre il libro è con te puoi lanciarli a volontà, non contano nel numero di trucchetti conosciuti e sono considerati incantesimi da warlock per te. Se perdi il libro, puoi eseguire una cerimonia di 1 ora (anche durante un riposo breve o lungo) per riceverne un sostituto dal patrono.",
  'Patto del Talismano':
    "Il patrono ti conferisce un amuleto speciale. Quando chi indossa il talismano fallisce una prova di caratteristica, può aggiungere 1d4 al tiro, potenzialmente trasformando il fallimento in un successo. Questo beneficio può essere usato un numero di volte pari al tuo bonus di competenza, recuperando tutti gli usi spesi al termine di un riposo lungo.",
};

export const WARLOCK_CORE_REFERENCE: Record<string, { level: number; body: string }> = {
  'MAGIA DEL PATTO': {
    level: 1,
    body:
      "Le ricerche arcane del warlock e l'influenza del patrono gli donano la capacità di lanciare incantesimi. " +
      "Slot Incantesimo: tutti gli slot incantesimo del warlock hanno lo stesso livello. Per lanciare un incantesimo da warlock di 1° livello o superiore, spende uno slot. " +
      "Il warlock recupera TUTTI gli slot incantesimo della Magia del Patto quando completa un riposo breve o lungo. " +
      "Caratteristica da Incantatore: Carisma (CD Salvezza = 8 + PB + CAR; Bonus Attacco Incantesimi = PB + CAR). Può usare un focus arcano.",
  },
  'SUPPLICHE OCCULTE': {
    level: 2,
    body:
      "Nel corso delle sue ricerche sulle conoscenze occulte, il warlock ha scoperto le suppliche occulte, frammenti di conoscenze proibite che lo infondono di capacità magiche permanenti. " +
      "Al 2° livello apprende 2 suppliche. Ne apprende altre progredendo nei livelli (fino a 8 al 18°). " +
      "Ogni volta che acquisisce un livello da warlock, può sostituire una supplica conosciuta con un'altra per cui soddisfa i prerequisiti.",
  },
  'DONO DEL PATTO': {
    level: 3,
    body:
      "Al 3° livello, il patrono conferisce al warlock un dono per ringraziarlo dei suoi servigi a scelta tra:\n" +
      "• Patto della Catena: apprende il trucchetto Trova Famiglio (come rituale, non conta nel limite). Può scegliere forme speciali: imp, pseudodrago, quasit o spiritello. Con l'azione di Attacco può rinunciare a un attacco per far attaccare il famiglio con la sua reazione.\n" +
      "• Patto della Lama: con un'azione crea un'arma del patto magica nello spazio libero della sua mano. È competente con essa finché la impugna. Può trasformare un'arma magica nella sua arma del patto con un rituale di 1 ora.\n" +
      "• Patto del Tomo: riceve il Libro delle Ombre contenente 3 trucchetti a scelta da qualsiasi lista di classe; sono considerati trucchetti da warlock e non contano nel limite.\n" +
      "• Patto del Talismano: riceve un amuleto. Quando chi lo indossa fallisce una prova di caratteristica, può aggiungere 1d4 al tiro (PB volte per riposo lungo).",
  },
  'ARCANUM MISTICO': {
    level: 11,
    body:
      "Il patrono conferisce al warlock un segreto magico chiamato arcanum. " +
      "All'11° livello sceglie un incantesimo da warlock di 6° livello come arcanum. " +
      "Può lanciarlo una volta senza spendere uno slot incantesimo, e recupera l'uso dopo un riposo lungo.\n" +
      "Progressione: incantesimo di 7° livello al 13°, di 8° livello al 15° e di 9° livello al 17°. Recupera tutti gli utilizzi con un riposo lungo.",
  },
  'MAESTRO DELL\'OCCULTO': {
    level: 20,
    body:
      "Al 20° livello, il warlock può attingere alla sua riserva interiore invocando il proprio patrono per riottenere gli slot incantesimo spesi. " +
      "Può trascorrere 1 minuto invocando l'aiuto del patrono per recuperare tutti gli slot incantesimo concessi dalla Magia del Patto. " +
      "Una volta utilizzato questo privilegio, deve completare un riposo lungo prima di poterlo fare di nuovo.",
  },
};

export function warlockReferenceCards(level: number, pactBoon?: WarlockPactBoon): ReferenceCard[] {
  const cards: ReferenceCard[] = [];

  // Privilegio del Patrono Ultraterreno 1° livello
  cards.push({
    level: 1,
    title: 'Patrono Ultraterreno (1° Livello)',
    source: 'Manuale del Giocatore / Supplementi',
    body: 'Al 1° livello il warlock sceglie il proprio Patrono Ultraterreno, che gli conferisce privilegi speciali e una lista ampliata di incantesimi.',
  });

  // Dono del Patto (3° livello)
  if (level >= 3) {
    cards.push({
      level: 3,
      title: pactBoon ? `Dono del Patto: ${pactBoon}` : 'Dono del Patto',
      source: 'Manuale del Giocatore p. 107',
      body: pactBoon ? WARLOCK_PACT_BOON_SUMMARIES[pactBoon] : WARLOCK_CORE_REFERENCE['DONO DEL PATTO'].body,
    });
  }

  // Privilegio del Patrono Ultraterreno 6° livello
  if (level >= 6) {
    cards.push({
      level: 6,
      title: 'Patrono Ultraterreno (6° Livello)',
      source: 'Manuale del Giocatore / Supplementi',
      body: 'Al 6° livello il warlock ottiene un ulteriore privilegio conferito dal suo Patrono Ultraterreno.',
    });
  }

  // Privilegio del Patrono Ultraterreno 10° livello
  if (level >= 10) {
    cards.push({
      level: 10,
      title: 'Patrono Ultraterreno (10° Livello)',
      source: 'Manuale del Giocatore / Supplementi',
      body: 'Al 10° livello il warlock ottiene un potente privilegio difensivo o di potenziamento dal suo Patrono.',
    });
  }

  // Arcanum Mistico (11° livello)
  if (level >= 11) {
    const unlockedArcanum = [
      '6° livello',
      ...(level >= 13 ? ['7° livello'] : []),
      ...(level >= 15 ? ['8° livello'] : []),
      ...(level >= 17 ? ['9° livello'] : []),
    ].join(', ');
    cards.push({
      level: 11,
      title: 'Arcanum Mistico',
      source: 'Manuale del Giocatore p. 107',
      body: pactBoon
        ? `Arcanum sbloccati: ${unlockedArcanum}. Puoi lanciare ciascun incantesimo di Arcanum Mistico 1 volta senza spendere uno slot incantesimo; recuperi tutti gli usi al termine di un riposo lungo.`
        : WARLOCK_CORE_REFERENCE['ARCANUM MISTICO'].body,
    });
  }

  // Privilegio del Patrono Ultraterreno 14° livello
  if (level >= 14) {
    cards.push({
      level: 14,
      title: 'Patrono Ultraterreno (14° Livello)',
      source: 'Manuale del Giocatore / Supplementi',
      body: 'Al 14° livello il warlock sblocca il privilegio culminante del proprio Patrono Ultraterreno.',
    });
  }

  // Maestro dell'Occulto (20° livello)
  if (level >= 20) {
    cards.push({
      level: 20,
      title: 'Maestro dell\'Occulto',
      source: 'Manuale del Giocatore p. 108',
      body: WARLOCK_CORE_REFERENCE['MAESTRO DELL\'OCCULTO'].body,
    });
  }

  return cards;
}
