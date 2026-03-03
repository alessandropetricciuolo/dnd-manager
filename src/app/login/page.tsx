"use client";

import { useState, type FormEvent } from "react";
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

    setIsLoading(true);
    try {
      const action = mode === "login" ? login : signup;
      const result = await action(email, password);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      if (mode === "login") {
        toast.success("Accesso effettuato. Ben tornato, avventuriero!");
        router.push("/dashboard");
      } else {
        toast.success(
          "Registrazione completata. Il tuo profilo 'player' è stato creato."
        );
        setMode("login");
      }
    } catch {
      toast.error("Qualcosa è andato storto. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-emerald-700/50 bg-slate-950/70 shadow-[0_0_40px_rgba(16,185,129,0.25)] backdrop-blur">
        <CardHeader className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-emerald-400/70">
            Barber & Dragons
          </p>
          <CardTitle className="text-2xl font-semibold text-slate-50">
            Portale dell&apos;Avventuriero
          </CardTitle>
          <CardDescription className="text-slate-300">
            {mode === "login"
              ? "Accedi per continuare la tua campagna."
              : "Crea un account per iniziare una nuova avventura."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="inline-flex w-full rounded-full border border-emerald-700/60 bg-slate-900/60 p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-full px-3 py-1.5 transition ${
                mode === "login"
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-300 hover:text-emerald-200"
              }`}
            >
              Accedi
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-full px-3 py-1.5 transition ${
                mode === "signup"
                  ? "bg-emerald-500 text-slate-950 shadow"
                  : "text-slate-300 hover:text-emerald-200"
              }`}
            >
              Registrati
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="avventuriero@esempio.com"
                className="bg-slate-900/70 border-slate-700/70 text-slate-50 placeholder:text-slate-500"
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                className="bg-slate-900/70 border-slate-700/70 text-slate-50 placeholder:text-slate-500"
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
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

        <CardFooter className="flex flex-col items-start gap-1 text-xs text-slate-400">
          <p>
            Con l&apos;accesso creiamo automaticamente un profilo{" "}
            <span className="font-semibold text-emerald-300">player</span> per
            te.
          </p>
          <p>In futuro potrai diventare Game Master dalle impostazioni.</p>
        </CardFooter>
      </Card>
    </div>
  );
}

