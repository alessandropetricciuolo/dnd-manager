import { getForgeAuthContext } from "@/lib/forge/access";
import { fetchForgeInventoryMovements, fetchForgeProductsWithStock } from "@/lib/forge/actions";
import { ForgeInventoryClient } from "@/components/forge/forge-inventory-client";

export const dynamic = "force-dynamic";

export default async function ForgeInventoryPage() {
  const ctx = await getForgeAuthContext();
  const [products, movements] = await Promise.all([
    fetchForgeProductsWithStock(),
    fetchForgeInventoryMovements(),
  ]);

  return (
    <ForgeInventoryClient
      products={products}
      initialMovements={movements}
      isAdmin={ctx?.isAdmin ?? false}
    />
  );
}
