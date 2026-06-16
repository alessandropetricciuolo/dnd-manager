import { redirect } from "next/navigation";
import { getForgeAuthContext, listGmUsersForForgeAccess } from "@/lib/forge/access";
import { ForgeAccessClient } from "@/components/forge/forge-access-client";

export const dynamic = "force-dynamic";

export default async function ForgeAccessPage() {
  const ctx = await getForgeAuthContext();
  if (!ctx?.isAdmin) redirect("/forge");

  const gms = await listGmUsersForForgeAccess();
  return <ForgeAccessClient gms={gms} />;
}
