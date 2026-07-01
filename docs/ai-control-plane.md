# AI Control Plane

## Stato: Fase 5 implementata (voice input + Livello 2)

L'AI propone action tramite `ai_action_requests`. Il GM applica o scarta. Input testo **e voce** finiscono in `command_inputs`.

## Livelli autonomia

| Livello | Comportamento | Stato B&D |
|---------|---------------|-----------|
| 1 | Bozze / proposte | ✓ |
| **2** | **Esecuzione con conferma GM** | **Attivo** |
| 3+ | Maggiore autonomia | Non pianificato |

## Flusso voice (Fase 5)

```
Microfono (Web Speech API, it-IT)
  → transcript normalizzato
  → command_inputs (source: voice, transcript, metadata.voice)
  → stesso flusso AI / inbox del testo
```

## Dove è disponibile la voce

| UI | Comportamento |
|----|----------------|
| **Cattura rapida** (header) | Dettatura → nota inbox automatica |
| **Assistente GM** | Dettatura → interpretazione AI + bozze |

## Moduli voice

```
src/modules/command-center/voice/
├── command-input-voice.ts   # normalizzazione + payload
├── use-voice-dictation.ts   # hook Web Speech API
└── __tests__/command-input-voice.test.ts
```

Componente UI: `src/components/command-center/voice-capture-button.tsx`

## Requisiti browser

- Chrome / Edge / Safari (Web Speech API)
- Permesso microfono
- Se non supportato, il pulsante microfono non viene mostrato

## Fase 6 (prossima)

- Porting gmflow (`gmflow.adapter.ts`)
