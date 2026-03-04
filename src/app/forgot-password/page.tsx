"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/app/auth/actions";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") as string | null)?.trim() ?? "";
    if (!email) {
      toast.error("Inserisci l'email.");
      return;
    }
    setIsLoading(true);
    try {
      const result = await requestPasswordReset(email);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setSent(true);
      toast.success("Controlla la tua email.");
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
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-barber-gold/70">Barber & Dragons</p>
          <CardTitle className="text-2xl font-semibold text-barber-paper flex items-center gap-2">
            <Mail className="h-6 w-6 text-barber-gold" />
            Recupero password
          </CardTitle>
          <CardDescription className="text-barber-paper/70">
            Inserisci l&apos;email con cui ti sei registrato. Ti invieremo un link per reimpostare la password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="rounded-lg border border-barber-gold/30 bg-barber-gold/10 px-4 py-6 text-center">
              <p className="text-barber-paper font-medium">Controlla la tua email.</p>
              <p className="mt-1 text-sm text-barber-paper/70">
                Clicca sul link che ti abbiamo inviato per impostare una nuova password.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-barber-paper/90">Email</Label>
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
              <Button
                type="submit"
                className="w-full bg-barber-red hover:bg-barber-red/90 text-barber-paper font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Invio in corso..." : "Invia link di recupero"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 text-sm">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-barber-gold hover:text-barber-gold/80 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Torna al login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
