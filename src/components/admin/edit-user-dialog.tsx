"use client";

import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { useRouter } from "nextjs-toploader/app";
import { Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserProfile } from "@/app/admin/actions";

const ROLES = [
  { value: "player", label: "Player" },
  { value: "gm", label: "GM" },
  { value: "admin", label: "Admin" },
] as const;

type EditUserDialogProps = {
  userId: string;
  defaultValues: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    role: string;
  };
};

export function EditUserDialog({ userId, defaultValues }: EditUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState(defaultValues.role);

  useEffect(() => {
    if (open) setRole(defaultValues.role);
  }, [open, defaultValues.role]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get("email") as string)?.trim() ?? "";
    const first_name = (formData.get("first_name") as string)?.trim() || null;
    const last_name = (formData.get("last_name") as string)?.trim() || null;
    const phone = (formData.get("phone") as string)?.trim() || null;

    setIsLoading(true);
    try {
      const result = await updateUserProfile(userId, {
        email: email || undefined,
        first_name,
        last_name,
        phone,
        role: ROLES.find((r) => r.value === role)?.value ?? (defaultValues.role as "player" | "gm" | "admin"),
      });
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Errore durante il salvataggio.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-barber-gold/40 text-barber-paper hover:bg-barber-gold/10"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Modifica
        </Button>
      </DialogTrigger>
      <DialogContent className="border-barber-gold/40 bg-barber-dark text-barber-paper">
        <DialogHeader>
          <DialogTitle>Modifica utente</DialogTitle>
          <DialogDescription className="text-barber-paper/70">
            Aggiorna anagrafica, email e ruolo. L&apos;utente riceverà un&apos;email se cambi l&apos;indirizzo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email" className="text-barber-paper/90">
              Email
            </Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={defaultValues.email}
              placeholder="email@esempio.it"
              className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper placeholder:text-barber-paper/50"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first_name" className="text-barber-paper/90">
                Nome
              </Label>
              <Input
                id="edit-first_name"
                name="first_name"
                defaultValue={defaultValues.first_name ?? ""}
                className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last_name" className="text-barber-paper/90">
                Cognome
              </Label>
              <Input
                id="edit-last_name"
                name="last_name"
                defaultValue={defaultValues.last_name ?? ""}
                className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone" className="text-barber-paper/90">
              Telefono
            </Label>
            <Input
              id="edit-phone"
              name="phone"
              type="tel"
              defaultValue={defaultValues.phone ?? ""}
              placeholder="+39 ..."
              className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper placeholder:text-barber-paper/50"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-barber-paper/90">Ruolo</Label>
            <Select value={role} onValueChange={setRole} disabled={isLoading}>
              <SelectTrigger className="border-barber-gold/30 bg-barber-dark/80 text-barber-paper">
                <SelectValue placeholder="Ruolo" />
              </SelectTrigger>
              <SelectContent className="border-barber-gold/20 bg-barber-dark">
                {ROLES.map(({ value, label }) => (
                  <SelectItem
                    key={value}
                    value={value}
                    className="text-barber-paper focus:bg-barber-gold/20 focus:text-barber-gold"
                  >
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-barber-paper/30 text-barber-paper"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              className="bg-barber-gold text-barber-dark hover:bg-barber-gold/90"
              disabled={isLoading}
            >
              {isLoading ? "Salvataggio..." : "Salva"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
