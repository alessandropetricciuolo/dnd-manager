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
        const redirectTo = searchParams.get("redirect") ?? "/dashboard";
        router.push(redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard");
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
    <div className="relative min-h-screen bg-guild-void flex items-center justify-center p-4 md:px-6 overflow-hidden">
      {/* Sfondo caldo e sfumato da taverna */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-luminosity filter blur-md"
        style={{ backgroundImage: `url(/hero-tabletop.jpg)` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(200,157,73,0.12),transparent)]" aria-hidden />

      <div className="card-guild-stone relative w-full max-w-md rounded-2xl p-6 sm:p-8 shadow-2xl z-10">
        <div className="corner-ornament-tl" />
        <div className="corner-ornament-tr" />
        <div className="corner-ornament-bl" />
        <div className="corner-ornament-br" />

        <div className="space-y-1.5 text-center mb-6">
          <p className="text-[11px] font-serif uppercase tracking-[0.25em] text-brass-base">
            ✦ Barber &amp; Dragons ✦
          </p>
          <h1 className="font-serif text-2xl font-extrabold tracking-tight text-gold-relief sm:text-3xl">
            Portale dell&apos;Avventuriero
          </h1>
          <p className="text-xs text-parchment-300">
            {mode === "login"
              ? "Accedi con le tue credenziali per continuare la tua saga."
              : "Crea il tuo profilo di gilda per unirti al tavolo."}
          </p>
        </div>

        <div className="space-y-6">
          <div className="inline-flex w-full rounded-xl border border-brass-base/30 bg-guild-void/80 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setSignupCompleted(false);
              }}
              className={`flex-1 min-h-[40px] rounded-lg font-serif uppercase tracking-wider font-semibold transition ${
                mode === "login"
                  ? "bg-crimson-base text-parchment-100 shadow-md"
                  : "text-parchment-300 hover:text-brass-light"
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 min-h-[40px] rounded-lg font-serif uppercase tracking-wider font-semibold transition ${
                mode === "signup"
                  ? "bg-crimson-base text-parchment-100 shadow-md"
                  : "text-parchment-300 hover:text-brass-light"
              }`}
            >
              Registrati
            </button>
          </div>

          {mode === "signup" && signupCompleted ? (
            <div className="space-y-4 rounded-xl border border-brass-base/30 bg-guild-stone p-5 text-center">
              <h3 className="font-serif text-lg font-bold text-gold-relief">Registrazione Completata</h3>
              <p className="text-xs leading-relaxed text-parchment-300">
                Il tuo account è pronto. Se vuoi, entra nella community per restare aggiornato sulle prossime
                giocate.
              </p>
              {signupRequiresEmailConfirm && (
                <p className="text-xs text-parchment-400">
                  Potrebbe essere richiesta la conferma email prima del primo accesso in dashboard.
                </p>
              )}
              {signupWhatsappOptIn && whatsappCommunityLink ? (
                <a
                  href={whatsappCommunityLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-xs font-serif uppercase tracking-wider font-semibold text-white transition hover:bg-emerald-600 shadow-md"
                >
                  Unisciti alla Community WhatsApp
                </a>
              ) : null}
              <Button
                type="button"
                variant="stone"
                className="w-full text-xs font-serif uppercase tracking-wider font-semibold text-brass-light"
                onClick={() => {
                  if (signupRequiresEmailConfirm) {
                    setMode("login");
                    setSignupCompleted(false);
                    return;
                  }
                  router.push("/dashboard");
                }}
              >
                {signupRequiresEmailConfirm ? "Vai al login dopo conferma email" : "Entra nella Dashboard"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="first_name" className="text-[11px] font-serif uppercase tracking-wider text-brass-light">
                    Nome
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    placeholder="Mario"
                    className="h-11 border-guild-border bg-guild-void/80 text-parchment-100 placeholder:text-parchment-500/50 focus:border-brass-base"
                    disabled={isLoading}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="last_name" className="text-[11px] font-serif uppercase tracking-wider text-brass-light">
                    Cognome
                  </Label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Rossi"
                    className="h-11 border-guild-border bg-guild-void/80 text-parchment-100 placeholder:text-parchment-500/50 focus:border-brass-base"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="date_of_birth" className="text-[11px] font-serif uppercase tracking-wider text-brass-light">
                  Data di nascita
                </Label>
                <Input
                  id="date_of_birth"
                  name="date_of_birth"
                  type="date"
                  autoComplete="bday"
                  className="h-11 border-guild-border bg-guild-void/80 text-parchment-100 focus:border-brass-base"
                  disabled={isLoading}
                  required
                />
              </div>
            )}
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[11px] font-serif uppercase tracking-wider text-brass-light">
                  Cellulare
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+39 333 1234567"
                  className="h-11 border-guild-border bg-guild-void/80 text-parchment-100 placeholder:text-parchment-500/50 focus:border-brass-base"
                  disabled={isLoading}
                />
              </div>
            )}
            {mode === "signup" && (
              <div className="rounded-lg border border-brass-base/20 bg-guild-void/70 p-3">
                <label htmlFor="whatsapp_opt_in" className="flex items-start gap-2.5 text-xs text-parchment-300">
                  <input
                    id="whatsapp_opt_in"
                    name="whatsapp_opt_in"
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-guild-border bg-guild-void text-brass-base focus:ring-brass-base"
                    disabled={isLoading}
                  />
                  <span>
                    Acconsento a essere aggiunto alla community WhatsApp di Barber &amp; Dragons per le giocate dal vivo.
                  </span>
                </label>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-serif uppercase tracking-wider text-brass-light">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="avventuriero@esempio.com"
                className="h-11 border-guild-border bg-guild-void/80 text-parchment-100 placeholder:text-parchment-500/50 focus:border-brass-base"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[11px] font-serif uppercase tracking-wider text-brass-light">
                  Password
                </Label>
                {mode === "login" && (
                  <Link
                    href="/forgot-password"
                    className="text-xs text-brass-base hover:text-brass-light transition-colors"
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
                className="h-11 border-guild-border bg-guild-void/80 text-parchment-100 placeholder:text-parchment-500/50 focus:border-brass-base"
                disabled={isLoading}
                required
              />
            </div>

            <SubmitButton
              pending={isLoading}
              loadingText="Accesso ai registri..."
              className="mt-2 w-full min-h-[46px] btn-wax-seal rounded-lg font-serif uppercase tracking-widest font-bold text-parchment-100 shadow-xl"
            >
              {mode === "login" ? "Entra nella Taverna" : "Crea il tuo Eroe"}
            </SubmitButton>
            </form>
          )}
        </div>

        <div className="mt-6 border-t border-guild-border/80 pt-4 text-center text-[11px] text-parchment-500 space-y-1">
          <p>
            Con l&apos;accesso creiamo automaticamente un profilo{" "}
            <span className="font-semibold text-brass-light font-mono">player</span>.
          </p>
          <p>In futuro potrai richiedere l&apos;abilitazione Game Master.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-guild-void" />}>
      <LoginPageContent />
    </Suspense>
  );
}
