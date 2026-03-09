"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "nextjs-toploader/app";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

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
import { updatePassword } from "@/app/auth/password-actions";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const newPassword = (formData.get("new_password") as string)?.trim() ?? "";
    const confirmPassword = (formData.get("confirm_password") as string)?.trim() ?? "";

    if (!newPassword || newPassword.length < 6) {
      toast.error("La password deve avere almeno 6 caratteri.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Le password non coincidono.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await updatePassword(newPassword);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Password aggiornata. Reindirizzamento...");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Qualcosa è andato storto. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-barber-dark flex items-center justify-center px-4">
      <Card className="w-full max-w-md border-barber-gold/40 bg-barber-dark/95 shadow-[0_0_40px_rgba(251,191,36,0.15)] backdrop-blur">
        <CardHeader className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-barber-gold/70">
            Barber & Dragons
          </p>
          <CardTitle className="text-2xl font-semibold text-barber-paper flex items-center gap-2">
            <Lock className="h-6 w-6 text-barber-gold" />
            Nuova password
          </CardTitle>
          <CardDescription className="text-barber-paper/70">
            Scegli una nuova password per il tuo account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-barber-paper/90">
                Nuova password
              </Label>
              <Input
                id="new_password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={6}
                className="bg-barber-dark border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password" className="text-barber-paper/90">
                Conferma password
              </Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={6}
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
              {isLoading ? "Salvataggio..." : "Aggiorna password"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-barber-gold hover:text-barber-gold/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Vai alla dashboard
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
