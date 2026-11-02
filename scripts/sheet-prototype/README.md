# Bardo: prototipo locale di stampa

Non collegato all'esportazione di produzione. Nessuna modifica al motore delle regole.

1. `npx tsx scripts/sheet-prototype/export-bard.ts`
2. Eseguire `scripts/sheet-prototype/render-bard.py` con Python e ReportLab.

Output: `output/pdf/bardo-prototipo/`. Il JSON del generatore è conservato integralmente; `fonti.json` registra gli estratti e l'hash del manuale. Il renderer è deliberatamente limitato al campione Bardo 5 / Sapienza e fallisce con altri input.

I blocchi sono disegnati come vettori e testo, senza PDF base compilabile. Le descrizioni sono estratti deterministici dal manuale locale; la progressione del dado è riportata accanto al testo base per evitare ambiguità d6/d8. Le regole che non entrano proseguono in una seconda pagina. Non è ancora una scheda completa: inventario, incantesimi estesi e tratti razziali non sono inclusi.

Limiti rilevati nel campione del generatore: abilità non competenti prive del contributo di Factotum; competenze aggiuntive di Sapienza da verificare. I dati sono mantenuti senza correzioni implicite. Nessuna certificazione di correttezza complessiva dei calcoli. Questo risultato serve a valutare impaginazione e leggibilità.
