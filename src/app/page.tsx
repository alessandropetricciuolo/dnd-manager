import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-primary">Barber & Dragons</h1>
      <p className="mt-2 text-muted-foreground">
        D&D Campaign Manager — Wiki per giocatori, strumento per Master.
      </p>
      <Button className="mt-4" asChild>
        <Link href="/login">Inizia</Link>
      </Button>
    </main>
  );
}
