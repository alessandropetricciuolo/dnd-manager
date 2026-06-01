/** Messaggio utente per errori nel salvataggio scheda PDF (client o server action). */
export function formatSheetSaveError(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message.trim();
    if (/body exceeded|body size limit/i.test(m)) {
      return "Il PDF è troppo grande per il salvataggio automatico. Disattiva il Manuale rapido (torneo), riduci la storia del personaggio, oppure scarica il PDF e caricalo manualmente.";
    }
    if (/failed to fetch|networkerror|load failed/i.test(m)) {
      return "Connessione interrotta durante il salvataggio. Verifica la rete e riprova.";
    }
    if (/winansi|encode/i.test(m)) {
      return "Il PDF contiene caratteri non supportati. Rimuovi simboli speciali dalla storia e riprova.";
    }
    if (m) return m;
  }
  return "Errore imprevisto durante il salvataggio della scheda PDF.";
}
