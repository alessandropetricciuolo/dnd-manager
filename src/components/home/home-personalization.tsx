"use client";

import Link from "next/link";
import { Dices, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { getUserDisplayName } from "@/lib/user-display-name";

export function HomeWelcome() {
  const { user } = useSupabaseUser();
  if (!user) return null;

  return (
    <div className="border-b border-brass-base/20 bg-gradient-to-r from-brass-base/15 via-brass-base/5 to-transparent">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-parchment-100/90 sm:text-base">
          <span className="font-semibold text-brass-light font-serif">Bentornato, {getUserDisplayName(user)}.</span>{" "}
          Le prossime serate al tavolo e le tue iscrizioni ti aspettano.
        </p>
        <Button asChild size="sm" variant="secondary" className="shrink-0">
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" /> Area personale
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function HomeHeroActions() {
  const { user } = useSupabaseUser();
  const loggedIn = Boolean(user);
  return (
    <div className="flex flex-wrap items-center gap-4 pt-1">
      <Button asChild size="lg" variant="wax" className="h-12 px-8 text-base shadow-xl tracking-wider font-serif uppercase font-bold">
        <Link href={loggedIn ? "/dashboard" : "/login"} className="inline-flex items-center gap-2.5">
          <Dices className="h-5 w-5 text-brass-light" />
          <span>{loggedIn ? "Le mie avventure" : "Unisciti alla Gilda"}</span>
        </Link>
      </Button>
      <Button asChild variant="outline" size="lg" className="h-12 px-7 text-sm font-semibold tracking-wide border-brass-base/50 text-brass-light hover:bg-brass-base/15">
        <Link href={loggedIn ? "/profile" : "/scopri"}>{loggedIn ? "Il mio profilo" : "Scopri le Avventure"}</Link>
      </Button>
    </div>
  );
}

export function HomeClosingCallToAction() {
  const { user } = useSupabaseUser();
  const loggedIn = Boolean(user);
  return (
    <>
      <h2 className="mt-3 font-serif text-3xl font-extrabold tracking-tight text-gold-relief sm:text-5xl leading-tight">
        {loggedIn ? "Pronto per la prossima serata al tavolo?" : "Pronto a vivere D&D come non l'hai mai giocato?"}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-parchment-300 sm:text-lg">
        {loggedIn
          ? "Controlla le date disponibili, prepara il personaggio e vieni a giocare dal vivo con i tuoi compagni."
          : "Unisciti alla community Barber & Dragons. Scegli la tua avventura, prenota il tuo posto al tavolo e tira il tuo primo d20."}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button asChild size="lg" variant="wax" className="h-13 px-9 text-base font-serif uppercase tracking-wider font-bold shadow-2xl">
          <Link href={loggedIn ? "/dashboard" : "/login"}>{loggedIn ? "Le mie avventure" : "Unisciti alla Gilda"}</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-13 px-7 text-sm font-semibold border-brass-base/50 text-brass-light hover:bg-brass-base/15">
          <Link href="/masters">Esplora l&apos;Albo Master</Link>
        </Button>
      </div>
    </>
  );
}

export function HomeJoinButton() {
  const { user } = useSupabaseUser();
  if (user) return null;
  return (
    <div className="mt-8">
      <Button asChild variant="wax" size="default" className="h-11 px-6 font-serif uppercase tracking-wider">
        <Link href="/login">Unisciti alla Gilda</Link>
      </Button>
    </div>
  );
}
