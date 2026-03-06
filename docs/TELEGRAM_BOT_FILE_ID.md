# Bot Telegram: risposta automatica con File ID

Per file **oltre 4MB** l’upload web non è possibile (limite Vercel/Server Actions). L’utente può inviare il file al Bot in privato e incollare il **File ID** nel form. Per averlo senza cercarlo a mano, puoi far rispondere il Bot con il `file_id` quando riceve un documento o una foto.

## Configurazione rapida

1. **Crea il Bot** con [@BotFather](https://t.me/BotFather): `/newbot` → ottieni il token.
2. **Imposta le variabili** in `.env.local`:
   - `TELEGRAM_BOT_TOKEN=...`
   - `TELEGRAM_CHAT_ID=...` (ID della chat/canale dove il Bot invia i file caricati dall’app; per la risposta in privato non serve).

3. **Risposta automatica con File ID**  
   Il Bot deve ricevere gli aggiornamenti (messaggi in privato) e rispondere con il `file_id`. Due modi:

### Opzione A: Webhook integrato (consigliato)

L'app ha già la route **File ID Extractor**. In `.env.local` aggiungi:
- `TELEGRAM_ADMIN_ID=<tuo_id_telegram>` (ottieni l'ID con [@userinfobot](https://t.me/userinfobot))
- `TELEGRAM_WEBHOOK_BASE_URL=https://tuodominio.vercel.app`
Poi apri **GET /api/setup-webhook** una volta per registrare il webhook. Da quel momento, inviando un file/foto al Bot in privato riceverai il File ID in un blocco copiabile.

- Alternativa manuale: imposta un webhook su `https://tuodominio.com/api/telegram-webhook` (o simile).
- Alla ricezione di `message.document` o `message.photo`:
  - **Documento**: `file_id = message.document.file_id`
  - **Foto**: `file_id = message.photo[message.photo.length - 1].file_id` (migliore qualità)
- Invia una risposta nella stessa chat con quel `file_id` (es. “File ID: `BQACAgIAAxkB…`”) così l’utente può copiarlo.

### Opzione B: Script locale con long polling

- Usa una libreria tipo [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) o [Telegraf](https://telegraf.js.org/).
- Avvia il bot in long polling; in ascolto su `message`:
  - Se `msg.document`: rispondi con `msg.document.file_id`.
  - Se `msg.photo`: rispondi con `msg.photo[msg.photo.length - 1].file_id`.
- L’utente invia il file in privato al Bot → il Bot risponde con il File ID → l’utente lo incolla nel campo “Incolla File ID Telegram”.

Esempio minimo (Node, `node-telegram-bot-api`):

```js
const TelegramBot = require("node-telegram-bot-api");
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on("document", (msg) => {
  const fileId = msg.document.file_id;
  bot.sendMessage(msg.chat.id, `File ID:\n\`${fileId}\`\n\nCopia e incolla nel form.`, { parse_mode: "Markdown" });
});

bot.on("photo", (msg) => {
  const photo = msg.photo[msg.photo.length - 1];
  bot.sendMessage(msg.chat.id, `File ID (foto):\n\`${photo.file_id}\``, { parse_mode: "Markdown" });
});
```

Dopo aver inviato un documento o una foto al Bot in privato, riceverai il messaggio con il File ID da copiare nel form.
