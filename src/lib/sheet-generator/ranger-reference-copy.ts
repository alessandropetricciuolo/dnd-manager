import type { PrintFeature } from './manual-feature-text';

export function rangerReferenceCards(level: number): PrintFeature[] {
  const cards: PrintFeature[] = [
    {
      title: 'Consapevolezza Primordiale',
      level: 3,
      source: 'Ranger 5e / Manuale del Giocatore',
      body: 'Puoi usare un\'azione e spendere uno slot incantesimo per rilevare la presenza di un tipo di creatura in un\'area di 1,5 km (9 km nel terreno prescelto): aberrazioni, celestiali, draghi, elementali, folletti, immondi e non morti. Non rivela numero o posizione esatta. Durata: 1 minuto per livello dello slot speso.',
    },
    {
      title: 'Attacco Extra',
      level: 5,
      source: 'Ranger 5e / Manuale del Giocatore',
      body: 'Ogni volta che effettui l\'azione di Attacco nel tuo turno, puoi attaccare due volte anziché una.',
    },
    {
      title: 'Andatura sul Territorio',
      level: 8,
      source: 'Ranger 5e / Manuale del Giocatore',
      body: 'Muoversi attraverso vegetali non magici e terreno difficile non magico non costa movimento extra. I vegetali non ti infliggono danni e hai vantaggio ai tiri salvezza contro vegetali creati o manipolati magicamente per ostacolare il movimento.',
    },
    {
      title: 'Nascondersi in Piena Vista',
      level: 10,
      source: 'Ranger 5e / Manuale del Giocatore',
      body: 'Impiegando 1 minuto per mimetizzarti con elementi naturali contro una superficie solida larga almeno quanto te, ottieni un bonus di +10 alle prove di Destrezza (Furtività). Il bonus rimane finché non ti muovi o effettui azioni/reazioni.',
    },
    {
      title: 'Svanire',
      level: 14,
      source: 'Ranger 5e / Manuale del Giocatore',
      body: 'Puoi usare l\'azione di Nascondersi come azione bonus nel tuo turno. Inoltre non è possibile seguire le tue tracce tramite mezzi non magici a meno che tu non decida di lasciare una pista.',
    },
    {
      title: 'Sensi Ferini',
      level: 18,
      source: 'Ranger 5e / Manuale del Giocatore',
      body: 'Localizzi esattamente qualsiasi creatura non nascosta entro 9 metri purché tu non sia accecato o assordato. Inoltre attaccare una creatura che non sei in grado di vedere non impone più svantaggio ai tuoi tiri per colpire.',
    },
    {
      title: 'Sterminatore di Nemici',
      level: 20,
      source: 'Ranger 5e / Manuale del Giocatore',
      body: 'Una volta per ogni tuo turno, puoi aggiungere il tuo modificatore di Saggezza al tiro per colpire o al tiro per i danni di un attacco con arma effettuato contro uno dei tuoi nemici prescelti.',
    },
  ];

  return cards.filter((c) => c.level <= level);
}
