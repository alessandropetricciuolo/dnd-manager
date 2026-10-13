import Link from "next/link";

export const metadata = {
  title: "Privacy | Barber & Dragons",
  description: "Informativa privacy e gestione dei dati di Barber & Dragons.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-barber-dark px-4 py-12 text-barber-paper">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-serif text-3xl font-semibold text-barber-gold md:text-4xl">Privacy</h1>
        <p className="mt-5 leading-7 text-barber-paper/85">
          L’informativa privacy e cookie pubblicata per Barber &amp; Dragons è disponibile nel documento gestito tramite il servizio Iubenda attivo sul sito.
        </p>
        <p className="mt-4">
          <a className="text-barber-gold underline" href="https://www.iubenda.com/privacy-policy/43878034" target="_blank" rel="noreferrer">
            Apri l’informativa privacy
          </a>
        </p>
        <p className="mt-6 leading-7 text-barber-paper/85">
          Per assistenza o per inviare una richiesta relativa al tuo account, usa il <Link className="text-barber-gold underline" href="/support">canale di supporto</Link>. Per chiedere la cancellazione, consulta la pagina <Link className="text-barber-gold underline" href="/delete-account">Eliminazione account</Link>.
        </p>
      </article>
    </main>
  );
}
