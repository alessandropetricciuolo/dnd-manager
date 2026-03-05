import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy & Cookie Policy | Barber & Dragons",
  description: "Informativa privacy e cookie di Barber & Dragons",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-barber-dark px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-8 inline-flex">
          <Button
            variant="ghost"
            size="sm"
            className="text-barber-paper/80 hover:text-barber-gold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Home
          </Button>
        </Link>

        <h1 className="font-serif text-3xl font-semibold text-barber-gold md:text-4xl">
          Privacy & Cookie Policy
        </h1>

        <div className="mt-8 space-y-8 text-barber-paper/90">
          <section>
            <h2 className="mb-2 font-serif text-xl font-medium text-barber-gold">
              Titolare del Trattamento
            </h2>
            <p className="leading-relaxed">
              Barber & Dragons.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-medium text-barber-gold">
              Dati raccolti
            </h2>
            <p className="leading-relaxed">
              Email, Nome, Cognome e Telefono, per finalità di erogazione del servizio (gestione account, campagne e sessioni di gioco).
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-serif text-xl font-medium text-barber-gold">
              Cookie
            </h2>
            <p className="leading-relaxed">
              Utilizziamo cookie tecnici necessari per l&apos;autenticazione e il funzionamento della piattaforma (Supabase). Sono inoltre utilizzati cookie di terze parti per i contenuti multimediali (es. Google). Puoi gestire le tue preferenze tramite il banner cookie in fondo alla pagina.
            </p>
          </section>
        </div>

        <div className="mt-12">
          <Link href="/">
            <Button
              variant="outline"
              className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
            >
              Torna alla Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
