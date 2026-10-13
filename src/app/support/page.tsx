import Link from "next/link";

export const metadata = {
  title: "Supporto | Barber & Dragons",
  description: "Contatta il supporto di Barber & Dragons.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-barber-dark px-4 py-12 text-barber-paper">
      <article className="mx-auto max-w-2xl">
        <h1 className="font-serif text-3xl font-semibold text-barber-gold">Supporto</h1>
        <p className="mt-5 leading-7 text-barber-paper/85">
          Per problemi di accesso, richieste sull’account o segnalazioni, scrivi al team tramite il modulo Contatti. Non inserire password o codici di accesso nel messaggio.
        </p>
        <Link href="/contatti" className="mt-6 inline-flex rounded-md border border-brass-base/50 px-4 py-3 font-semibold text-barber-gold hover:bg-brass-base/10">
          Apri il modulo Contatti
        </Link>
        <p className="mt-8 text-sm leading-6 text-barber-paper/70">
          Puoi inoltre consultare l’<Link href="/privacy" className="text-barber-gold underline">informativa privacy</Link> o inviare una <Link href="/delete-account" className="text-barber-gold underline">richiesta di cancellazione account</Link>.
        </p>
      </article>
    </main>
  );
}
