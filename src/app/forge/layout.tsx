import { redirect } from "next/navigation";
import { getForgeAuthContext } from "@/lib/forge/access";
import { ForgeShell } from "@/components/forge/forge-shell";

export const dynamic = "force-dynamic";

export default async function ForgeLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getForgeAuthContext();
  if (!ctx) redirect("/login");
  if (!ctx.hasForgeAccess) redirect("/dashboard?forge=denied");

  return <ForgeShell isAdmin={ctx.isAdmin}>{children}</ForgeShell>;
}
