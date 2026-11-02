import type { PrintFeature } from './manual-feature-text';

export function sorcererReferenceCards(level: number): PrintFeature[] {
  const cards: PrintFeature[] = [
    {
      title: 'Fonte di Magia',
      level: 2,
      source: 'Stregone 5e / Manuale del Giocatore',
      body: 'Disponi di una riserva di punti stregoneria pari al tuo livello da stregone. Recuperi tutti i punti al riposo lungo.\n\n• Creare Slot (az. bonus): 1° (2 pt), 2° (3 pt), 3° (5 pt), 4° (6 pt), 5° (7 pt). Max slot 5° liv.\n• Convertire Slot (az. bonus): spendi uno slot per recuperare punti pari al suo livello.',
    },
    {
      title: 'Metamagia',
      level: 3,
      source: 'Stregone 5e / Manuale del Giocatore',
      body: `Plasmi gli incantesimi secondo le tue necessità (${level >= 17 ? 4 : level >= 10 ? 3 : 2} opzioni di Metamagia note al tuo livello). Puoi applicare una sola opzione di Metamagia a un incantesimo quando lo lanci, salvo diversa indicazione (es. Incantesimo Potenziato).`,
    },
    {
      title: 'Ripristino Stregonesco',
      level: 20,
      source: 'Stregone 5e / Manuale del Giocatore',
      body: 'Recuperi 4 punti stregoneria spesi ogni volta che completi un riposo breve.',
    },
  ];

  return cards.filter((c) => c.level <= level);
}
