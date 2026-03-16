import { ContactForm } from "./contact-form";

export const metadata = {
  title: "Contatti | Barber & Dragons",
  description: "Invia un messaggio alla gilda Barber & Dragons.",
};

export default function ContattiPage() {
  return (
    <main className="min-h-screen bg-barber-dark">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-barber-gold sm:text-4xl md:text-center">
          Invia un Messaggio alla Gilda
        </h1>
        <p className="mt-3 text-barber-paper/80 sm:text-lg md:text-center">
          Domande, proposte o un corvo messaggero? Compila il form e ti risponderemo alla tua email.
        </p>
        <div className="mt-10">
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
