"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useRouter } from "nextjs-toploader/app";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser } from "@/app/admin/actions";

export function CreateUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    setIsLoading(true);
    try {
      const result = await createUser(formData);
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        form.reset();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Errore durante la creazione.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Nuovo utente
        </Button>
      </DialogTrigger>
      <DialogContent className="border-emerald-700/50 bg-slate-950 text-slate-50">
        <DialogHeader>
          <DialogTitle>Nuova anagrafica utente</DialogTitle>
          <DialogDescription className="text-slate-400">
            Inserisci email e password provvisoria. L&apos;utente potrà cambiare la password al primo accesso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input
              id="create-email"
              name="email"
              type="email"
              placeholder="nome@esempio.it"
              className="border-slate-600 bg-slate-900/70 text-slate-50"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Password (provvisoria)</Label>
            <Input
              id="create-password"
              name="password"
              type="password"
              placeholder="Almeno 6 caratteri"
              minLength={6}
              className="border-slate-600 bg-slate-900/70 text-slate-50"
              required
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-first-name">Nome</Label>
              <Input
                id="create-first-name"
                name="first_name"
                placeholder="Mario"
                className="border-slate-600 bg-slate-900/70 text-slate-50"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-last-name">Cognome</Label>
              <Input
                id="create-last-name"
                name="last_name"
                placeholder="Rossi"
                className="border-slate-600 bg-slate-900/70 text-slate-50"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="border-slate-600 text-slate-300"
            >
              Annulla
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              {isLoading ? "Creazione..." : "Crea utente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
