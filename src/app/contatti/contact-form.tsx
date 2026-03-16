"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { sendContactEmail } from "./actions";
import { Send } from "lucide-react";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await sendContactEmail(formData);
      if (result.success) {
        toast.success(result.message);
        setSuccess(true);
        form.reset();
      } else {
        toast.error(result.message);
      }
    });
  }

  if (success) {
    return (
      <Card className="border-barber-gold/30 bg-barber-dark/90 text-barber-paper">
        <CardHeader>
          <CardTitle className="text-barber-gold">Messaggio inviato</CardTitle>
          <CardDescription className="text-barber-paper/80">
            Grazie per averci scritto. Controlleremo la casella e ti risponderemo al più presto
            all&apos;indirizzo che ci hai indicato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="border-barber-gold/40 text-barber-gold hover:bg-barber-gold/10"
            onClick={() => setSuccess(false)}
          >
            Invia un altro messaggio
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-barber-gold/30 bg-barber-dark/90 shadow-[0_0_40px_rgba(251,191,36,0.08)]">
      <CardHeader>
        <CardTitle className="text-barber-gold">Contattaci</CardTitle>
        <CardDescription className="text-barber-paper/70">
          Compila i campi e clicca su &quot;Invia Corvo Messaggero&quot;. Riceverai risposta alla tua email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="contact-name" className="text-barber-paper">
              Nome
            </Label>
            <Input
              id="contact-name"
              name="name"
              type="text"
              required
              placeholder="Il tuo nome o soprannome"
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-email" className="text-barber-paper">
              Email
            </Label>
            <Input
              id="contact-email"
              name="email"
              type="email"
              required
              placeholder="tua@email.com"
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-subject" className="text-barber-paper">
              Oggetto
            </Label>
            <Input
              id="contact-subject"
              name="subject"
              type="text"
              required
              placeholder="Es. Informazioni, Collaborazione, Bug..."
              className="bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-message" className="text-barber-paper">
              Messaggio
            </Label>
            <Textarea
              id="contact-message"
              name="message"
              required
              minLength={10}
              placeholder="Scrivi qui il tuo messaggio..."
              className="min-h-[150px] resize-y bg-barber-dark/80 border-barber-gold/30 text-barber-paper placeholder:text-barber-paper/50"
              disabled={isPending}
            />
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="w-full gap-2 bg-barber-gold text-barber-dark hover:bg-barber-gold/90 sm:w-auto"
          >
            <Send className="h-4 w-4" />
            {isPending ? "Invio in corso..." : "Invia Corvo Messaggero"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
