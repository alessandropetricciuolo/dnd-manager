"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

import { login, signup } from "@/app/auth/actions";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [isLoading, setIsLoading] = useState(false);

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
      if (!firstName || !lastName || !phone) {
        toast.error("Inserisci Nome, Cognome e Cellulare.");
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result?.error) {
          toast.error(result.error);
          return;
        }
        toast.success("Accesso effettuato. Ben tornato, avventuriero!");
        router.push("/dashboard");
        return;
      }
      const firstName = (formData.get("first_name") as string | null)?.trim() ?? "";
      const lastName = (formData.get("last_name") as string | null)?.trim() ?? "";
      const phone = (formData.get("phone") as string | null)?.trim() ?? "";
      const result = await signup(email, password, firstName, lastName, phone);

      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        "Registrazione completata. Il tuo profilo 'player' è stato creato."
      );
      setMode("login");
    } catch {
      toast.error("Qualcosa è andato storto. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-barber-dark flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-barber-gold/40 bg-barber-dark/95 shadow-[0_0_40px_rgba(251,191,36,0.15)] backdrop-blur">
        <CardHeader className="space-y-2">
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

        <CardContent className="space-y-6">
          <div className="inline-flex w-full rounded-full border border-barber-gold/50 bg-barber-dark p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-3 py-1.5 transition ${
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
              className={`flex-1 rounded-full px-3 py-1.5 transition ${
                mode === "signup"
                  ? "bg-barber-red text-barber-paper shadow"
                  : "text-barber-paper/80 hover:text-barber-gold"
              }`}
            >
              Registrati
            </button>
          </div>

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
                <Label htmlFor="phone" className="text-slate-200">
                  Cellulare
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+39 333 1234567"
                  className="bg-slate-900/70 border-slate-700/70 text-slate-50 placeholder:text-slate-500"
                  disabled={isLoading}
                  required
                />
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

            <Button
              type="submit"
              className="w-full bg-barber-red hover:bg-barber-red/90 text-barber-paper font-semibold"
              disabled={isLoading}
            >
              {isLoading
                ? "Elaborazione..."
                : mode === "login"
                  ? "Entra nella Taverna"
                  : "Crea il tuo eroe"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-1 text-xs text-barber-paper/60">
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

