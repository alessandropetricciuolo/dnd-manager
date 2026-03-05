"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/app/auth/password-actions";

export function ChangePasswordForm() {
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
      toast.success("Password aggiornata con successo.");
      form.reset();
    } catch {
      toast.error("Qualcosa è andato storto. Riprova più tardi.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-barber-gold/30 bg-barber-dark/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-barber-paper">
          <Lock className="h-5 w-5 text-barber-gold" />
          Modifica password
        </CardTitle>
        <CardDescription className="text-barber-paper/70">
          Scegli una nuova password per il tuo account. Dopo il cambio dovrai usarla al prossimo accesso.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile_new_password" className="text-barber-paper/90">
              Nuova password
            </Label>
            <Input
              id="profile_new_password"
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
            <Label htmlFor="profile_confirm_password" className="text-barber-paper/90">
              Conferma password
            </Label>
            <Input
              id="profile_confirm_password"
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
            className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
            disabled={isLoading}
          >
            {isLoading ? "Salvataggio..." : "Aggiorna password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
