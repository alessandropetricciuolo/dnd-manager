"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ChevronRight, Dices, Map, Shield } from "lucide-react";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

import { submitLeadAction } from "@/lib/actions/leads";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormValues = {
  name: string;
  email: string;
  experience: "first_time" | "some" | "veteran";
  consent: boolean;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-crimson-light">{message}</p>;
}

export function ScopriLanding() {
  const { user } = useSupabaseUser();
  const recruitmentRef = useRef<HTMLDivElement | null>(null);

  const promises = useMemo(
    () => [
      {
        title: "Nessun Microfono Mutato",
        description:
          "Crediamo nel rumore dei dadi sul tavolo e nelle risate in faccia. Da noi si gioca esclusivamente dal vivo. Lascia a casa il computer.",
        Icon: Dices,
      },
      {
        title: "One-Shot, Quest o Campagne",
        description:
          "Hai solo una sera libera? Fai una One-Shot. Vuoi una mini-storia? Prova le Quest (3-4 sessioni). Cerchi la gloria eterna? Entra nelle nostre epiche Campagne Condivise.",
        Icon: Map,
      },
      {
        title: "Tu Gioca, Al Resto Pensiamo Noi",
        description:
          "Il tuo gruppo storico si è sciolto? Non trovi mai un Master? Entra in Gilda: siediti, apri la scheda e inizia a giocare. L'organizzazione è affar nostro.",
        Icon: Shield,
      },
    ],
    []
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      experience: "first_time",
      consent: false,
    },
    mode: "onTouched",
  });

  const consent = watch("consent");
  const [submitted, setSubmitted] = useState(false);

  function scrollToForm() {
    recruitmentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const onSubmit = handleSubmit(async (data) => {
    const formData = new FormData();
    formData.set("name", data.name);
    formData.set("email", data.email);
    formData.set("experience_level", data.experience);
    formData.set("marketing_opt_in", data.consent ? "true" : "false");

    const result = await submitLeadAction(formData);

    if (result.success) {
      setSubmitted(true);
      reset({ name: "", email: "", experience: "first_time", consent: false });
      toast.success("Benvenuto a bordo! Ti scriveremo presto.");
    } else {
      toast.error(result.message ?? "Qualcosa è andato storto. Riprova.");
    }
  });

  return (
    <main className="min-h-screen bg-guild-void text-parchment-100 font-sans">
      {/* HERO */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden border-b border-guild-border">
        {/* Background ambience */}
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity filter blur-sm"
          style={{ backgroundImage: `url(/hero-tabletop.jpg)` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(200,157,73,0.18),transparent)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-b from-guild-void/70 via-guild-void/90 to-guild-void"
        />

        <div className="relative mx-auto w-full max-w-2xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brass-base/40 bg-guild-oak/90 px-4 py-1 text-xs font-serif uppercase tracking-[0.2em] text-brass-light shadow-sm">
              <span>✦ Bando di Reclutamento ✦</span>
            </div>
          </div>

          <h1 className="mt-6 font-serif text-4xl font-extrabold tracking-tight text-gold-relief sm:text-5xl md:text-6xl">
            Il Gioco di Ruolo.
            <br />
            <span className="font-normal italic text-brass-base">Quello Vero.</span>
          </h1>

          <p className="mt-5 text-balance text-base leading-relaxed text-parchment-300 sm:text-lg">
            Spegni lo schermo, afferra i tuoi dadi. Unisciti alla gilda di D&amp;D dal
            vivo, dove le avventure si vivono faccia a faccia e le birre non sono
            virtuali.
          </p>

          {user ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href="/dashboard"
                className="btn-wax-seal flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-xl text-base shadow-xl tracking-wider font-serif uppercase font-bold text-parchment-100 hover:scale-[1.02] transition-all"
              >
                <span>Vai alla tua Dashboard</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
              <p className="text-xs text-brass-base font-serif">
                ✦ Fai già parte della Gilda Barber & Dragons
              </p>
            </div>
          ) : (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                type="button"
                onClick={scrollToForm}
                size="lg"
                variant="wax"
                className="h-12 w-full max-w-sm text-base shadow-xl tracking-wider font-serif uppercase font-bold"
              >
                Firma il Contratto di Gilda
              </Button>
              <p className="text-xs text-parchment-500">
                Nessun muro di testo. Pochi tap e il tuo nome è all&apos;albo.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 3 PROMESSE */}
      <section className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-brass-base/80 font-serif">
            Il Nostro Credo
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-gold-relief sm:text-3xl">
            Perché unirti alla Gilda?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-parchment-300">
            Tre promesse scolpite nella pietra. Tutto pensato per giocare bene dal vivo.
          </p>
        </div>

        <div className="space-y-4">
          {promises.map(({ title, description, Icon }) => (
            <div
              key={title}
              className="card-guild-stone rounded-xl p-6 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-brass-base/40 bg-guild-stone text-brass-light shadow-inner">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif text-lg font-bold text-parchment-100">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-parchment-300">
                    {description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FORM: CONTRATTO DI GILDA */}
      <section
        ref={recruitmentRef}
        className="mx-auto w-full max-w-2xl px-4 pb-20 sm:px-6 sm:pb-24"
      >
        <div className="card-guild-stone rounded-2xl p-7 sm:p-9 shadow-2xl">
          <div className="corner-ornament-tl" />
          <div className="corner-ornament-tr" />
          <div className="corner-ornament-bl" />
          <div className="corner-ornament-br" />

          <div className="text-center mb-6">
            <span className="text-[11px] font-serif uppercase tracking-[0.25em] text-brass-base">
              ✦ Registro dei Nuovi Arrivi ✦
            </span>
            <h2 className="mt-2 font-serif text-2xl font-extrabold text-gold-relief sm:text-3xl">
              {user ? "Sei Già un Eroe di Gilda" : "Firma il Bando di Gilda"}
            </h2>
            <p className="mt-1.5 text-xs text-parchment-300 sm:text-sm">
              {user
                ? "Il tuo profilo è già registrato nei tomi di Barber & Dragons."
                : "Lascia i tuoi dati: i corvi della Gilda ti contatteranno per la prossima avventura."}
            </p>
          </div>

          <div>
            {user ? (
              <div className="rounded-xl border border-brass-base/40 bg-guild-oak/80 p-8 text-center shadow-lg">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-brass-base bg-crimson-base text-brass-light font-bold">
                  ⚔️
                </div>
                <p className="font-serif text-xl font-bold text-gold-relief">
                  La tua spada è già schierata al tavolo
                </p>
                <p className="mt-2 text-sm text-parchment-300 max-w-md mx-auto">
                  Sei autenticato con il tuo profilo. Puoi consultare le saghe attive, vedere il calendario dei tavoli o unirti a una sessione aperta direttamente dalla tua dashboard.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link
                    href="/dashboard"
                    className="btn-wax-seal inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-serif text-xs font-bold uppercase tracking-wider text-parchment-100 shadow-md hover:scale-[1.02] transition-all"
                  >
                    <span>Apri la tua Dashboard</span>
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : submitted ? (
              <div className="rounded-xl border border-brass-base/40 bg-guild-oak/80 p-8 text-center shadow-lg">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-brass-base bg-crimson-base text-brass-light">
                  ✦
                </div>
                <p className="font-serif text-xl font-bold text-gold-relief">
                  La Gilda ha registrato il tuo nome.
                </p>
                <p className="mt-2 text-sm text-parchment-300">
                  Lucidate i dadi e tenete pronta la spada. Ti scriveremo a breve.
                </p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="scopri-name" className="text-xs font-serif uppercase tracking-wider text-brass-light">
                    Nome / Nickname dell&apos;Eroe
                  </Label>
                  <Input
                    id="scopri-name"
                    inputMode="text"
                    autoComplete="name"
                    placeholder="Es. Sir Brancaleone"
                    className="h-12 border-guild-border bg-guild-void/80 text-parchment-100 placeholder:text-parchment-500/50 focus:border-brass-base"
                    disabled={isSubmitting}
                    {...register("name", {
                      required: "Inserisci un nome o nickname.",
                      minLength: { value: 2, message: "Minimo 2 caratteri." },
                    })}
                  />
                  <FieldError message={errors.name?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scopri-email" className="text-xs font-serif uppercase tracking-wider text-brass-light">
                    Indirizzo di Contatto (Email)
                  </Label>
                  <Input
                    id="scopri-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="cavaliere@regno.it"
                    className="h-12 border-guild-border bg-guild-void/80 text-parchment-100 placeholder:text-parchment-500/50 focus:border-brass-base"
                    disabled={isSubmitting}
                    {...register("email", {
                      required: "Inserisci una email valida.",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Email non valida.",
                      },
                    })}
                  />
                  <FieldError message={errors.email?.message} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scopri-experience" className="text-xs font-serif uppercase tracking-wider text-brass-light">
                    Esperienza al Tavolo
                  </Label>
                  <select
                    id="scopri-experience"
                    className="h-12 w-full rounded-md border border-guild-border bg-guild-void/80 px-3 text-sm text-parchment-100 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-base/40 disabled:opacity-60"
                    disabled={isSubmitting}
                    {...register("experience", { required: true })}
                  >
                    <option value="first_time" className="bg-guild-stone text-parchment-100">
                      Prima volta in assoluto (voglio imparare)
                    </option>
                    <option value="some" className="bg-guild-stone text-parchment-100">
                      Ho giocato qualche volta (conosco le basi)
                    </option>
                    <option value="veteran" className="bg-guild-stone text-parchment-100">
                      Veterano navigato (conosco la 5e a memoria)
                    </option>
                  </select>
                </div>

                <div className="flex items-start gap-3 pt-1">
                  <input
                    id="scopri-consent"
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border-guild-border bg-guild-void text-brass-base focus:ring-brass-base"
                    disabled={isSubmitting}
                    {...register("consent", {
                      validate: (v) =>
                        v ? true : "Serve l'accettazione per essere ricontattato.",
                    })}
                  />
                  <div className="min-w-0">
                    <Label
                      htmlFor="scopri-consent"
                      className="text-xs leading-relaxed text-parchment-300"
                    >
                      Accetto di ricevere comunicazioni e missive dalla Gilda.
                    </Label>
                    <FieldError message={errors.consent?.message} />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !consent}
                  size="lg"
                  variant="wax"
                  className="mt-2 h-12 w-full text-sm font-serif uppercase tracking-widest font-bold shadow-lg disabled:opacity-50"
                >
                  {isSubmitting ? "Invio missiva..." : "Sigilla e Invia"}
                </Button>

                <p className="text-center text-[11px] text-parchment-500">
                  Niente spam, solo notifiche sui tavoli aperti e nuove quest.
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

