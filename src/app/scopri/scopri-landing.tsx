"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Dices, Map, Shield } from "lucide-react";

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
  return <p className="text-sm text-barber-red/90">{message}</p>;
}

export function ScopriLanding() {
  const recruitmentRef = useRef<HTMLDivElement | null>(null);

  const promises = useMemo(
    () => [
      {
        title: "Nessun Microfono Mutato",
        description:
          "Crediamo nel rumore dei dadi sul tavolo e nelle risate in faccia. Da noi si gioca esclusivamente dal vivo. Lascia a casa il computer.",
        Icon: Dices,
        iconClassName: "text-amber-500",
      },
      {
        title: "One-Shot, Quest o Campagne",
        description:
          "Hai solo una sera libera? Fai una One-Shot. Vuoi una mini-storia? Prova le Quest (3-4 sessioni). Cerchi la gloria eterna? Entra nelle nostre epiche Campagne Condivise.",
        Icon: Map,
        iconClassName: "text-red-500",
      },
      {
        title: "Tu Gioca, Al Resto Pensiamo Noi",
        description:
          "Il tuo gruppo storico si è sciolto? Non trovi mai un Master? Entra in Gilda: siediti, apri la scheda e inizia a giocare. L'organizzazione è affar nostro.",
        Icon: Shield,
        iconClassName: "text-amber-500",
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
    <main className="overflow-x-hidden bg-barber-dark text-barber-paper">
      {/* HERO */}
      <section className="relative flex min-h-[80vh] items-end overflow-hidden">
        {/* Background (no image dependency): gradients + vignette */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(1200px_800px_at_50%_20%,rgba(251,191,36,0.16),transparent_60%),radial-gradient(900px_700px_at_20%_60%,rgba(153,27,27,0.20),transparent_55%),linear-gradient(to_bottom,#0b0a09,#14110f_55%,#000)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.35),rgba(0,0,0,0.9)_70%,#000)]"
        />

        <div className="relative mx-auto w-full max-w-2xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14">
          <div className="flex justify-center">
            <Image
              src="/logo.png"
              alt="Barber & Dragons"
              width={220}
              height={80}
              priority
              className="h-12 w-auto object-contain sm:h-14"
            />
          </div>

          <h1 className="mt-8 text-balance text-4xl font-bold tracking-tight text-barber-gold sm:text-5xl">
            Il Gioco di Ruolo. Quello Vero.
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-barber-paper/80 sm:text-lg">
            Spegni lo schermo, afferra i tuoi dadi. Unisciti alla gilda di D&amp;D dal
            vivo, dove le avventure si vivono faccia a faccia e le birre non sono
            virtuali.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Button
              type="button"
              onClick={scrollToForm}
              className="h-12 w-full bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            >
              Unisciti alla Gilda
            </Button>
            <p className="text-xs leading-relaxed text-barber-paper/60">
              Nessun muro di testo. Pochi tap e sei dentro.
            </p>
          </div>
        </div>
      </section>

      {/* 3 PROMESSE */}
      <section className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-barber-paper">
            Perché unirti?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-barber-paper/70">
            Tre promesse, zero fronzoli. Tutto pensato per giocare bene dal vivo.
          </p>
        </div>

        <div className="space-y-4">
          {promises.map(({ title, description, Icon, iconClassName }) => (
            <Card
              key={title}
              className="border-barber-gold/25 bg-barber-dark/90"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md border border-barber-gold/25 bg-barber-dark/70 p-2">
                    <Icon className={`h-5 w-5 ${iconClassName}`} />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg text-barber-paper">
                      {title}
                    </CardTitle>
                    <CardDescription className="mt-1 text-barber-paper/70">
                      {description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* FORM */}
      <section
        ref={recruitmentRef}
        className="mx-auto w-full max-w-2xl px-4 pb-14 sm:px-6 sm:pb-16"
      >
        <Card className="border-barber-gold/30 bg-card/90 shadow-[0_0_40px_rgba(251,191,36,0.08)]">
          <CardHeader>
            <CardTitle className="text-2xl text-barber-gold">
              Unisciti alla Locanda
            </CardTitle>
            <CardDescription className="text-barber-paper/70">
              Lascia i tuoi dati: ti contattiamo per la prossima avventura.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="rounded-lg border border-barber-gold/25 bg-barber-dark/70 p-6 text-center">
                <p className="text-lg font-medium text-barber-gold">
                  La Gilda ha ricevuto il tuo messaggio.
                </p>
                <p className="mt-2 text-barber-paper/80">
                  Prepara i dadi, ti scriveremo presto.
                </p>
              </div>
            ) : (
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <div className="space-y-2">
                <Label htmlFor="scopri-name" className="text-barber-paper">
                  Nome / Nickname
                </Label>
                <Input
                  id="scopri-name"
                  inputMode="text"
                  autoComplete="name"
                  placeholder="Es. Sir Brancaleone"
                  className="h-12 bg-barber-dark/70 text-barber-paper placeholder:text-barber-paper/50"
                  disabled={isSubmitting}
                  {...register("name", {
                    required: "Inserisci un nome o nickname.",
                    minLength: { value: 2, message: "Minimo 2 caratteri." },
                  })}
                />
                <FieldError message={errors.name?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scopri-email" className="text-barber-paper">
                  Email
                </Label>
                <Input
                  id="scopri-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tua@email.com"
                  className="h-12 bg-barber-dark/70 text-barber-paper placeholder:text-barber-paper/50"
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
                <Label htmlFor="scopri-experience" className="text-barber-paper">
                  Esperienza
                </Label>
                <select
                  id="scopri-experience"
                  className="h-12 w-full rounded-md border border-barber-gold/25 bg-barber-dark/70 px-3 text-base text-barber-paper shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-barber-gold/40 disabled:opacity-60"
                  disabled={isSubmitting}
                  {...register("experience", { required: true })}
                >
                  <option value="first_time">Prima volta in assoluto</option>
                  <option value="some">Ho giocato qualche volta</option>
                  <option value="veteran">Veterano navigato</option>
                </select>
              </div>

              <div className="flex items-start gap-3">
                <input
                  id="scopri-consent"
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border border-barber-gold/30 bg-barber-dark/70 text-barber-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-barber-gold/40"
                  disabled={isSubmitting}
                  {...register("consent", {
                    validate: (v) =>
                      v ? true : "Serve l'accettazione per essere ricontattato.",
                  })}
                />
                <div className="min-w-0">
                  <Label
                    htmlFor="scopri-consent"
                    className="text-sm leading-relaxed text-barber-paper"
                  >
                    Accetto di ricevere comunicazioni.
                  </Label>
                  <FieldError message={errors.consent?.message} />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !consent}
                className="h-12 w-full bg-barber-red text-barber-paper hover:bg-barber-red/90 disabled:opacity-60"
              >
                {isSubmitting ? "Invio ai corvi..." : "Invia la tua Candidatura"}
              </Button>

              <p className="text-xs leading-relaxed text-barber-paper/60">
                Tip: i campi sono grandi per essere tappati senza zoom. Niente spam,
                solo aggiornamenti utili.
              </p>
            </form>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

