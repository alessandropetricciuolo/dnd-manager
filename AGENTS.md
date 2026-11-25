# Barber & Dragons — Istruzioni di progetto

## Continuità di prodotto e review

Prima di pianificare, implementare o revisionare una modifica, leggere `PRODUCT.md` dalla radice del repository. Verificare il comportamento attuale nel codice e nei test pertinenti. Collegare il lavoro a un obiettivo documentato, individuare i comportamenti da preservare e stabilire come verificare il risultato. In review, confrontare il diff con la richiesta e con la direzione concordata e segnalare regressioni e lacune di verifica. Per un fix piccolo bastano controlli mirati.

Se la proposta cambia l'utente di riferimento, il flusso principale o la promessa della release, spiegare ad Alessandro la decisione e il suo impatto e attendere la sua conferma prima di implementare o delegare. Dopo la conferma, aggiornare `PRODUCT.md` con la direzione concordata. Se il contesto è incompleto o contraddittorio, cercare le decisioni nel repository e chiedere solo il chiarimento che cambia il lavoro. Codice e test descrivono il comportamento esistente e le verifiche disponibili. Un cambiamento di direzione richiede una decisione esplicita.

Per i lavori sul generatore V2, seguire anche `docs/ANTIGRAVITY_GENERATORE_V2_HANDOFF.md` e `docs/GENERATORE_V2_LAB.md`. Applicare la stessa regola alla consegna ad Antigravity.
