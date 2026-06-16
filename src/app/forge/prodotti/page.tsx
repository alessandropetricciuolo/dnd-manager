import { fetchForgeProductsWithStock } from "@/lib/forge/actions";
import { ForgeProductsClient } from "@/components/forge/forge-products-client";

export const dynamic = "force-dynamic";

export default async function ForgeProductsPage() {
  const products = await fetchForgeProductsWithStock();
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean) as string[])].sort();

  return <ForgeProductsClient initialProducts={products} categories={categories} />;
}
