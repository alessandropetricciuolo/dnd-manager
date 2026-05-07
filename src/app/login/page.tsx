"use client";

import { Suspense, useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRouter as useTopLoaderRouter } from "nextjs-toploader/app";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { login, signup, updateProfileAfterSignup } from "@/app/auth/actions";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";

type Mode = "login" | "signup";

const WHATSAPP_CONFIRM_MESSAGE =
  "Vuoi continuare senza completare i dati WhatsApp?\n\n" +
  "La community WhatsApp e utile per aggiornamenti rapidi su tavoli e sessioni.\n\n" +
  "Puoi comunque procedere ora e aggiornare questi dati in un secondo momento.\n\n" +
  "Confermi di voler continuare?";
const UNDERAGE_ALERT_MESSAGE =
  "Ci dispiace, al momento l'associazione Barber & Dragons accetta solo utenti maggiorenni (18+).";

function isAdultFromIsoDate(dateIso: string): boolean {
  const trimmed = dateIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const [yearRaw, monthRaw, dayRaw] = trimmed.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age -= 1;
  return age >= 18;
}

function LoginPageContent() {
  const router = useTopLoaderRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [signupCompleted, setSignupCompleted] = useState(false);
  const [signupWhatsappOptIn, setSignupWhatsappOptIn] = useState(false);
  const [signupRequiresEmailConfirm, setSignupRequiresEmailConfirm] = useState(false);
  const whatsappCommunityLink = process.env.NEXT_PUBLIC_WHATSAPP_COMMUNITY_LINK?.trim() ?? "";

  useEffect(() => {
    if (searchParams.get("error") === "link_expired") {
      toast.error(
        "Il link di recupero è scaduto o non valido. Richiedi un nuovo link da «Password dimenticata»."
      );
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    const password = (formData.get("password") as string | null) ?? "";

    if (!email || !password) {
      toast.error("Inserisci email e password.");
      return;
    }

    if (mode === "signup") {
      const firstName = (formData.get("first_name") as string | null)?.trim() ?? "";
      const lastName = (formData.get("last_name") as string | null)?.trim() ?? "";
      const phone = (formData.get("phone") as string | null)?.trim() ?? "";
      const dateOfBirth = (formData.get("date_of_birth") as string | null)?.trim() ?? "";
      const whatsappOptIn = formData.get("whatsapp_opt_in") === "on";
      if (!dateOfBirth) {
        toast.error("La data di nascita è obbligatoria.");
        return;
      }
      if (!isAdultFromIsoDate(dateOfBirth)) {
        window.alert(UNDERAGE_ALERT_MESSAGE);
        return;
      }
      if (!firstName || !lastName || !phone) {
        const confirmed = window.confirm(WHATSAPP_CONFIRM_MESSAGE);
        if (!confirmed) {
          toast.error("Completa i campi richiesti per proseguire con la registrazione.");
          return;
        }
      }
      if (!whatsappOptIn) {
        const confirmed = window.confirm(WHATSAPP_CONFIRM_MESSAGE);
        if (!confirmed) {
          toast.error("Puoi attivare il consenso WhatsApp ora oppure in seguito dal profilo.");
          return;
        }
      }
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result?.error) {
          const msg = typeof result.error === "string" ? result.error : "Errore di accesso. Riprova.";
          toast.error(msg);
          return;
        }
        toast.success("Accesso effettuato. Ben tornato, avventuriero!");
        router.push("/dashboard");
        return;
      }
      const firstName = (formData.get("first_name") as string | null)?.trim() ?? "";
      const lastName = (formData.get("last_name") as string | null)?.trim() ?? "";
      const phone = (formData.get("phone") as string | null)?.trim() ?? "";
      const dateOfBirth = (formData.get("date_of_birth") as string | null)?.trim() ?? "";
      const whatsappOptIn = formData.get("whatsapp_opt_in") === "on";
      // Registrazione lato client: browser → Supabase (evita 504 del serverless Vercel)
      const supabase = createSupabaseBrowserClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone,
            date_of_birth: dateOfBirth,
            whatsapp_opt_in: whatsappOptIn,
            role: "player",
          },
        },
      });

      if (signUpError) {
        const err = signUpError as { message?: string; status?: number; code?: string };
        const isRateLimit =
          err.status === 429 || err.code === "over_email_send_rate_limit";
        const msg = isRateLimit
          ? "Troppi tentativi di invio email in poco tempo. Riprova tra un'ora o contatta il gestore del sito."
          : (err.message?.trim() ||
              "Registrazione non riuscita. Controlla che l'email non sia già usata, che la password abbia almeno 6 caratteri e riprova.");
        toast.error(msg);
        return;
      }
      // Se c'è sessione (email non richiede conferma), aggiorna il profilo dal server
      if (data.session) {
        const profileResult = await updateProfileAfterSignup(firstName, lastName, phone, dateOfBirth, whatsappOptIn);
        if (profileResult?.error) {
          toast.warning("Account creato, ma profilo non aggiornato. Puoi completarlo dal profilo.");
        }
      }
      toast.success(
        "Registrazione completata. Il tuo profilo 'player' è stato creato."
      );
      setSignupWhatsappOptIn(whatsappOptIn);
      setSignupRequiresEmailConfirm(!data.session);
      setSignupCompleted(true);
    } catch {
      toast.error("Qualcosa è andato storto. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-barber-dark flex items-center justify-center p-4 md:px-6">
      <Card className="w-full max-w-md border-barber-gold/40 bg-barber-dark/95 shadow-[0_0_40px_rgba(251,191,36,0.15)] backdrop-blur p-4 md:p-6">
        <CardHeader className="space-y-2 px-0 pt-0">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-barber-gold/70">
            Barber & Dragons
          </p>
          <CardTitle className="text-2xl font-semibold text-barber-paper">
            Portale dell&apos;Avventuriero
          </CardTitle>
          <CardDescription className="text-barber-paper/80">
            {mode === "login"
              ? "Accedi per continuare la tua campagna."
              : "Crea un account per iniziare una nuova avventura."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 px-0 pb-0">
          <div className="inline-flex w-full rounded-full border border-barber-gold/50 bg-barber-dark p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setSignupCompleted(false);
              }}
              className={`flex-1 min-h-[44px] rounded-full px-3 py-2 transition ${
                mode === "login"
                  ? "bg-barber-red text-barber-paper shadow"
                  : "text-barber-paper/80 hover:text-barber-gold"
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 min-h-[44px] rounded-full px-3 py-2 transition ${
                mode === "signup"
                  ? "bg-barber-red text-barber-paper shadow"
                  : "text-barber-paper/80 hover:text-barber-gold"
              }`}
            >
              Registrati
            </button>
          </div>

          {mode === "signup" && signupCompleted ? (
            <div className="space-y-4 rounded-xl border border-barber-gold/30 bg-barber-dark/70 p-4">
              <h3 className="text-lg font-semibold text-barber-gold">Registrazione Completata</h3>
              <p className="text-sm text-barber-paper/85">
                Il tuo account e pronto. Se vuoi, entra nella community per restare aggiornato sulle prossime
                giocate.
              </p>
              {signupRequiresEmailConfirm && (
                <p className="text-xs text-barber-paper/70">
                  Potrebbe essere richiesta la conferma email prima del primo accesso in dashboard.
                </p>
              )}
              {signupWhatsappOptIn && whatsappCommunityLink ? (
                <a
                  href={whatsappCommunityLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  Unisciti alla Community WhatsApp
                </a>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="w-full border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
                onClick={() => {
                  if (signupRequiresEmailConfirm) {
                    setMode("login");
                    setSignupCompleted(false);
                    return;
                  }
                  router.push("/dashboard");
                }}
              >
                {signupRequiresEmailConfirm ? "Vai al login dopo conferma email" : "Vai alla Dashboard"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-barber-paper/90">
                    Nome
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Mario"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-barber-paper/90">
                    Cognome
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Rossi"
                    className="bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="date_of_birth" className="text-barber-paper/90">
                  Data di nascita
                </Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  autoComplete="bday"
                  className="bg-barber-dark border-barber-gold/30 text-barber-paper"
                  disabled={isLoading}
                  required
                />
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-barber-paper/90">
                  Cellulare
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+39 333 1234567"
                  className="bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
                  disabled={isLoading}
                />
              </div>
            )}
            {mode === "signup" && (
              <div className="rounded-md border border-barber-gold/20 bg-barber-dark/60 p-3">
                <label htmlFor="whatsapp_opt_in" className="flex items-start gap-3 text-sm text-barber-paper/85">
                  <input
                    id="whatsapp_opt_in"
                    name="whatsapp_opt_in"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-barber-gold/40 bg-barber-dark"
                    disabled={isLoading}
                  />
                  <span>
                    Acconsento a essere aggiunto alla community WhatsApp di Barber & Dragons, dove organizziamo le
                    giocate e condividiamo tutte le info utili.
                  </span>
                </label>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-barber-paper/90">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="avventuriero@esempio.com"
                className="bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-barber-paper/90">
                  Password
                </Label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-xs text-barber-gold hover:text-barber-gold/80 transition-colors"
                  >
                    Password dimenticata?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                className="bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
                disabled={isLoading}
                required
              />
            </div>

            <SubmitButton
              pending={isLoading}
              loadingText="Elaborazione..."
              className="w-full min-h-[44px] bg-barber-red hover:bg-barber-red/90 text-barber-paper font-semibold"
            >
              {mode === "login" ? "Entra nella Taverna" : "Crea il tuo eroe"}
            </SubmitButton>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-1 text-xs text-barber-paper/60 px-0 pb-0">
          <p>
            Con l&apos;accesso creiamo automaticamente un profilo{" "}
            <span className="font-semibold text-barber-gold">player</span> per
            te.
          </p>
          <p>In futuro potrai diventare Game Master dalle impostazioni.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-barber-dark" />}>
      <LoginPageContent />
    </Suspense>
  );
}

