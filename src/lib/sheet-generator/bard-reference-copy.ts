/**
 * Fixed display copy transcribed from the user's "Bardo 5e V1.4.pdf", p. 1.
 * This is reference-sheet wording, not a generated summary or a verbatim PHB excerpt.
 * Controfascino's last sentence is corrected from the PHB at the user's explicit request.
 * Only already-unlocked cards are shown. Computed values remain in the central column.
 */
import type { BardPrintFeature } from './bard-print-model';

const source = 'Scheda di riferimento Bardo 5e V1.4 / pagina 1';
export function bardReferenceCards(level: number): BardPrintFeature[] {
  const cards: BardPrintFeature[] = [
    {
      title: 'Ispirazione Bardica', level: 1, source,
      body: "Puoi utilizzare un’azione bonus per ispirare un altro personaggio tramite le tue parole o la tua musica. Il personaggio ispirato deve essere a 18 metri da te e in grado di sentirti. Quel personaggio guadagna un dado da ispirazione bardica che può usare per una prova a sua scelta nei prossimi 10 minuti, il dado può essere speso dopo aver lanciato il d20 ma prima di sapere se l’azione è riuscita. Ogni personaggio può avere solo un dado ispirazione alla volta. Il bardo può utilizzare questa capacità per un numero di volte pari al suo modificatore di Carisma, recupera gli utilizzi dopo un riposo lungo."
        + (level >= 5 ? '\n\nRecuperi i dadi di Ispirazione Bardica anche dopo un riposo breve.' : ''),
    },
    {
      title: 'Canto di Riposo', level: 2, source,
      body: 'Se durante un riposo breve utilizzi una musica o un’orazione lenitiva, chi è in grado di sentirti guadagna un dado extra di Punti Ferita se ha speso almeno un dado vita durante il riposo. Il tipo di dado aumenta con l’avanzare di livello.',
    },
    {
      title: 'Maestria', level: 3, source,
      body: 'Scegli 2 abilità in cui sei Competente, il bonus di Competenza raddoppia in ogni prova di caratteristica che utilizza le competenze scelte.'
        + (level >= 10 ? '\n\nScegli altre due Abilità.' : ''),
    },
    {
      title: 'Controfascino', level: 6, source: source + ' / ultima frase corretta dal Manuale del Giocatore',
      body: 'Puoi utilizzare un’azione che dura fino alla fine del tuo prossimo turno per eseguire un’esibizione che darà Vantaggio alle creature amiche entro 9metri contro tutti i Tiri Salvezza per non essere Affascinati o Spaventati. Solo le creature in grado di sentirti possono beneficiarne, l’effetto è cancellato se vieni Silenziato o finisci Incapacitato. Puoi porvi fine volontariamente (non è richiesta un’azione per farlo).',
    },
    {
      title: 'Segreti Magici', level: 10, source,
      body: 'Puoi scegliere 2 Incantesimi (di un livello che sai lanciare) dalla tabella di qualsiasi classe. Gli Incantesimi contano come Incantesimi da Bardo al fine di determinare gli Incantesimi conosciuti.'
        + (level >= 14 ? '\n\nApprendi altri 2 Incantesimi da qualsiasi classe.' : '')
        + (level >= 18 ? '\n\nApprendi altri 2 Incantesimi da qualsiasi classe.' : ''),
    },
    {
      title: 'Ispirazione Superiore', level: 20, source,
      body: 'Se non hai Ispirazioni Bardiche disponibili, ne recuperi una quando tiri per l’iniziativa.',
    },
  ];
  return cards.filter(card => card.level <= level);
}
