import Link from "next/link";
import { AccountDeletionRequest } from "@/components/account-deletion-request";

export const metadata = {
  title: "Eliminazione account | Barber & Dragons",
  description: "Invia una richiesta di cancellazione account a Barber & Dragons.",
};

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-barber-dark px-4 py-12 text-barber-paper">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl font-semibold text-barber-gold md:text-4xl">Eliminazione account</h1>
        <p className="mt-5 leading-7 text-barber-paper/85">
          Accedi per inviare una richiesta di cancellazione. La richiesta entra in una coda gestita manualmente dal team; l’invio non elimina automaticamente l’account o i dati associati.
        </p>
        <AccountDeletionRequest />
        <p className="mt-6 text-sm leading-6 text-barber-paper/70">
          Per informazioni sulla gestione dei dati consulta la <Link href="/privacy" className="text-barber-gold underline">pagina Privacy</Link>. Se hai bisogno di aiuto, usa il <Link href="/support" className="text-barber-gold underline">canale di supporto</Link>.
        </p>
      </article>
    </main>
  );
}
