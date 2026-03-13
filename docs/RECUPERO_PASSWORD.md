# Recupero password – email che non arrivano

Se la mail di recupero password non arriva, puoi risolvere in due modi.

## Opzione consigliata: invio tramite Gmail (app)

L’app può inviare direttamente l’email di recupero con il link di reset usando il tuo account Gmail. In questo caso **non** usiamo le email di Supabase.

**Cosa serve:**

1. **Variabili già usate per altre email (campagne, notifiche):**
   - `GMAIL_USER` – indirizzo Gmail (es. `tuaapp@gmail.com`)
   - `GMAIL_APP_PASSWORD` – [Password per le app](https://support.google.com/accounts/answer/185833) (non la password normale di Gmail)

2. **Supabase Service Role** (già usato per admin/backup):
   - In Supabase: **Project Settings → API** → copia la chiave **service_role** (segreta).
   - Impostala come variabile d’ambiente `SUPABASE_SERVICE_ROLE_KEY` (locale in `.env.local`, in produzione su Vercel).

3. **URL dell’app in produzione**
   - Imposta `NEXT_PUBLIC_APP_URL` con l’URL pubblico dell’app (es. `https://barberanddragons.com`), senza slash finale.

Se queste variabili sono impostate, al clic su “Invia link di recupero” l’app genera il link con l’API Admin di Supabase e invia l’email tramite Gmail. Di solito la consegna è più affidabile e meno soggetta a blocchi/spam rispetto alle email predefinite di Supabase.

---

## Opzione alternativa: email inviate da Supabase

Se non usi Gmail e vuoi che sia Supabase a inviare le email di recupero:

1. **Redirect URL consentiti**  
   In Supabase: **Authentication → URL Configuration → Redirect URLs**.  
   Aggiungi esattamente:
   - In sviluppo: `http://localhost:3000/auth/callback`
   - In produzione: `https://tuodominio.com/auth/callback`

2. **SMTP personalizzato (consigliato in produzione)**  
   Le email predefinite di Supabase sono limitate e possono finire in spam.  
   In Supabase: **Project Settings → Auth → SMTP Settings**:
   - Attiva **Custom SMTP**.
   - Inserisci i dati del tuo provider (Gmail, SendGrid, ecc.). Per Gmail usa `GMAIL_USER` e una **Password per le app** come password SMTP.

Dopo aver salvato, riprova “Recupero password”: Supabase invierà l’email con il link che reindirizza a `/auth/callback?next=/update-password`.
