"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { requireForgeAccess, requireForgeAdmin } from "@/lib/forge/access";
import type {
  ForgeAccountMovementType,
  ForgeAccountType,
  ForgeInventoryMovementType,
  ForgePaymentStatus,
  ForgeSaleItemInput,
} from "@/lib/forge/types";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

const FORGE_PATHS = ["/forge", "/forge/prodotti", "/forge/vendite", "/forge/magazzino", "/forge/conti", "/forge/report", "/forge/accessi"];

function revalidateForge() {
  for (const p of FORGE_PATHS) revalidatePath(p);
}

// ---------- Accessi (solo admin) ----------

export async function grantForgeAccessAction(userId: string, note?: string): Promise<ActionResult> {
  const ctx = await requireForgeAdmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("forge_access").upsert(
    {
      user_id: userId,
      enabled: true,
      granted_by: ctx.userId,
      granted_at: new Date().toISOString(),
      revoked_at: null,
      note: note?.trim() || null,
    },
    { onConflict: "user_id" }
  );

  if (error) return { success: false, error: error.message };
  revalidateForge();
  return { success: true };
}

export async function revokeForgeAccessAction(userId: string): Promise<ActionResult> {
  await requireForgeAdmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("forge_access")
    .update({ enabled: false, revoked_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  revalidateForge();
  return { success: true };
}

// ---------- Prodotti ----------

export async function upsertForgeProductAction(input: {
  id?: string;
  name: string;
  category?: string;
  description?: string;
  image_url?: string;
  cost_estimate: number;
  sale_price: number;
  min_stock: number;
  active: boolean;
}): Promise<ActionResult<{ id: string }>> {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const payload = {
    name: input.name.trim(),
    category: input.category?.trim() || null,
    description: input.description?.trim() || null,
    image_url: input.image_url?.trim() || null,
    cost_estimate: input.cost_estimate,
    sale_price: input.sale_price,
    min_stock: input.min_stock,
    active: input.active,
    updated_at: now,
  };

  if (input.id) {
    const { error } = await supabase.from("forge_products").update(payload).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidateForge();
    return { success: true, data: { id: input.id } };
  }

  const { data, error } = await supabase
    .from("forge_products")
    .insert({ ...payload, created_at: now })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateForge();
  return { success: true, data: { id: data.id } };
}

export async function uploadForgeProductImageAction(
  formData: FormData
): Promise<ActionResult<{ publicUrl: string }>> {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "File immagine mancante." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage.from("forge_products").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadErr) return { success: false, error: uploadErr.message };

  const { data } = supabase.storage.from("forge_products").getPublicUrl(path);
  return { success: true, data: { publicUrl: data.publicUrl } };
}

// ---------- Conti ----------

export async function upsertForgeAccountAction(input: {
  id?: string;
  name: string;
  type: ForgeAccountType;
  opening_balance: number;
  active: boolean;
  note?: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const payload = {
    name: input.name.trim(),
    type: input.type,
    opening_balance: input.opening_balance,
    active: input.active,
    note: input.note?.trim() || null,
    updated_at: now,
  };

  if (input.id) {
    const { error } = await supabase.from("forge_accounts").update(payload).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidateForge();
    return { success: true, data: { id: input.id } };
  }

  const { data, error } = await supabase
    .from("forge_accounts")
    .insert({ ...payload, created_at: now })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateForge();
  return { success: true, data: { id: data.id } };
}

export async function createForgeAccountMovementAction(input: {
  account_id: string;
  type: ForgeAccountMovementType;
  amount: number;
  reason?: string;
  category?: string;
  movement_date?: string;
}): Promise<ActionResult> {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("forge_account_movements").insert({
    account_id: input.account_id,
    type: input.type,
    amount: input.amount,
    reason: input.reason?.trim() || null,
    category: input.category?.trim() || null,
    movement_date: input.movement_date || new Date().toISOString(),
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidateForge();
  return { success: true };
}

// ---------- Magazzino ----------

export async function createForgeInventoryMovementAction(input: {
  product_id: string;
  type: ForgeInventoryMovementType;
  quantity: number;
  note?: string;
}): Promise<ActionResult> {
  await requireForgeAccess();
  if (input.type === "vendita") {
    return { success: false, error: "Le vendite si registrano dalla schermata Nuova vendita." };
  }

  let qty = input.quantity;
  if (input.type === "scarto" && qty > 0) qty = -qty;
  if (input.type === "produzione" || input.type === "reso") {
    if (qty < 0) qty = Math.abs(qty);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("forge_inventory_movements").insert({
    product_id: input.product_id,
    type: input.type,
    quantity: qty,
    note: input.note?.trim() || null,
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidateForge();
  return { success: true };
}

export async function deleteForgeInventoryMovementAction(id: string): Promise<ActionResult> {
  const ctx = await requireForgeAccess();
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("forge_inventory_movements")
    .select("sale_id")
    .eq("id", id)
    .maybeSingle();

  if (row?.sale_id && !ctx.isAdmin) {
    return { success: false, error: "Solo l'admin può eliminare movimenti collegati a una vendita." };
  }

  const { error } = await supabase.from("forge_inventory_movements").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidateForge();
  return { success: true };
}

// ---------- Vendite ----------

export async function createForgeSaleAction(input: {
  sale_date?: string;
  payment_status: ForgePaymentStatus;
  customer_name?: string;
  event_name?: string;
  account_id: string;
  note?: string;
  items: ForgeSaleItemInput[];
}): Promise<ActionResult<{ saleId: string }>> {
  await requireForgeAccess();
  if (!input.items.length) return { success: false, error: "Aggiungi almeno un prodotto." };

  const supabase = await createSupabaseServerClient();
  const itemsJson = input.items.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
    unit_price: i.unit_price,
  }));

  const { data, error } = await supabase.rpc("forge_create_sale", {
    p_sale_date: input.sale_date || new Date().toISOString(),
    p_payment_status: input.payment_status,
    p_customer_name: input.customer_name ?? null,
    p_event_name: input.event_name ?? null,
    p_account_id: input.account_id,
    p_note: input.note ?? null,
    p_items: itemsJson,
  });

  if (error) return { success: false, error: error.message };
  revalidateForge();
  return { success: true, data: { saleId: data as string } };
}

// ---------- Query helpers (server components) ----------

export async function fetchForgeDashboardData() {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    productsRes,
    stockRes,
    salesRes,
    salesMonthRes,
    accountsRes,
    balancesRes,
    recentOutRes,
    recentSalesRes,
  ] = await Promise.all([
    supabase.from("forge_products").select("id, name, min_stock, active, cost_estimate, sale_price").eq("active", true),
    supabase.from("forge_product_stock").select("product_id, stock"),
    supabase.from("forge_sales").select("total_amount"),
    supabase.from("forge_sales").select("total_amount").gte("sale_date", monthStart),
    supabase.from("forge_accounts").select("id, name, active").eq("active", true),
    supabase.from("forge_account_balances").select("account_id, balance"),
    supabase
      .from("forge_account_movements")
      .select("id, account_id, type, amount, reason, category, movement_date")
      .eq("type", "uscita")
      .order("movement_date", { ascending: false })
      .limit(8),
    supabase
      .from("forge_sales")
      .select("id, sale_date, total_amount, customer_name, event_name, payment_status")
      .order("sale_date", { ascending: false })
      .limit(8),
  ]);

  const stockMap = new Map((stockRes.data ?? []).map((s) => [s.product_id, Number(s.stock)]));
  const products = (productsRes.data ?? []).map((p) => ({
    ...p,
    stock: stockMap.get(p.id) ?? 0,
  }));
  const lowStock = products.filter((p) => p.stock < p.min_stock);

  const totalRevenue = (salesRes.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);
  const monthRevenue = (salesMonthRes.data ?? []).reduce((s, r) => s + Number(r.total_amount), 0);

  const balanceMap = new Map((balancesRes.data ?? []).map((b) => [b.account_id, Number(b.balance)]));
  const accounts = (accountsRes.data ?? []).map((a) => ({
    ...a,
    balance: balanceMap.get(a.id) ?? 0,
  }));
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Utile stimato: incassi - costo stimato prodotti venduti (approssimazione da sale_items)
  const { data: saleItems } = await supabase
    .from("forge_sale_items")
    .select("quantity, unit_price, product_id, forge_products(cost_estimate)");

  let estimatedProfit = 0;
  for (const item of saleItems ?? []) {
    const linked = (item as { forge_products?: { cost_estimate: number } | { cost_estimate: number }[] })
      .forge_products;
    const product = Array.isArray(linked) ? linked[0] : linked;
    const cost = Number(product?.cost_estimate ?? 0);
    const revenue = Number(item.unit_price) * Number(item.quantity);
    estimatedProfit += revenue - cost * Number(item.quantity);
  }

  return {
    totalRevenue,
    monthRevenue,
    estimatedProfit,
    activeProductsCount: products.length,
    lowStock,
    recentSales: recentSalesRes.data ?? [],
    accounts,
    totalBalance,
    recentOutflows: recentOutRes.data ?? [],
  };
}

export async function fetchForgeProductsWithStock(search?: string, category?: string) {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();

  let q = supabase.from("forge_products").select("*").order("name");
  if (category && category !== "all") q = q.eq("category", category);

  const [{ data: products }, { data: stockRows }] = await Promise.all([
    q,
    supabase.from("forge_product_stock").select("product_id, stock"),
  ]);

  const stockMap = new Map((stockRows ?? []).map((s) => [s.product_id, Number(s.stock)]));
  let list = (products ?? []).map((p) => ({ ...p, stock: stockMap.get(p.id) ?? 0 }));

  const s = search?.trim().toLowerCase();
  if (s) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(s) ||
        (p.category?.toLowerCase().includes(s) ?? false)
    );
  }

  return list;
}

export async function fetchForgeAccountsWithBalances(activeOnly = false) {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();

  let q = supabase.from("forge_accounts").select("*").order("name");
  if (activeOnly) q = q.eq("active", true);

  const [{ data: accounts }, { data: balances }] = await Promise.all([
    q,
    supabase.from("forge_account_balances").select("account_id, balance"),
  ]);

  const balanceMap = new Map((balances ?? []).map((b) => [b.account_id, Number(b.balance)]));

  return (accounts ?? []).map((a) => {
    const balance = balanceMap.get(a.id) ?? Number(a.opening_balance);
    return { ...a, balance };
  });
}

export async function fetchForgeInventoryMovements(filters?: {
  productId?: string;
  type?: string;
}) {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();

  let q = supabase
    .from("forge_inventory_movements")
    .select("*, forge_products(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters?.productId && filters.productId !== "all") {
    q = q.eq("product_id", filters.productId);
  }
  if (filters?.type && filters.type !== "all") {
    q = q.eq("type", filters.type);
  }

  const { data } = await q;
  return (data ?? []).map((row) => ({
    ...row,
    product_name: (row as { forge_products?: { name: string } }).forge_products?.name ?? "—",
  }));
}

export async function fetchForgeAccountMovements(accountId: string) {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("forge_account_movements")
    .select("*")
    .eq("account_id", accountId)
    .order("movement_date", { ascending: false })
    .limit(200);

  return data ?? [];
}

export async function fetchForgeReportData(from: string, to: string) {
  await requireForgeAccess();
  const supabase = await createSupabaseServerClient();

  const [{ data: sales }, { data: outflows }, { data: saleItems }] = await Promise.all([
    supabase
      .from("forge_sales")
      .select("id, sale_date, total_amount, account_id, event_name, forge_accounts(name)")
      .gte("sale_date", from)
      .lte("sale_date", to)
      .order("sale_date", { ascending: false }),
    supabase
      .from("forge_account_movements")
      .select("amount, type, movement_date, category")
      .gte("movement_date", from)
      .lte("movement_date", to),
    supabase.from("forge_sale_items").select("product_id, quantity, total_price, forge_products(name)"),
  ]);

  type SaleRow = {
    id: string;
    sale_date: string;
    total_amount: number;
    account_id: string;
    event_name: string | null;
    forge_accounts?: { name: string } | { name: string }[] | null;
  };

  const normalizedSales = (sales ?? []).map((sale) => {
    const row = sale as SaleRow;
    const linked = row.forge_accounts;
    const forge_accounts = Array.isArray(linked) ? linked[0] ?? null : linked ?? null;
    return {
      id: row.id,
      sale_date: row.sale_date,
      total_amount: Number(row.total_amount),
      account_id: row.account_id,
      event_name: row.event_name,
      forge_accounts,
    };
  });

  const revenue = normalizedSales.reduce((s, r) => s + r.total_amount, 0);
  const outflowTotal = (outflows ?? [])
    .filter((m) => m.type === "uscita")
    .reduce((s, m) => s + Math.abs(Number(m.amount)), 0);

  const byAccount = new Map<string, { name: string; total: number }>();
  for (const sale of normalizedSales) {
    const name = sale.forge_accounts?.name ?? sale.account_id.slice(0, 8);
    const prev = byAccount.get(sale.account_id) ?? { name, total: 0 };
    prev.total += sale.total_amount;
    byAccount.set(sale.account_id, prev);
  }

  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const item of saleItems ?? []) {
    const row = item as {
      product_id: string;
      quantity: number;
      total_price: number;
      forge_products?: { name: string } | { name: string }[];
    };
    const linked = row.forge_products;
    const product = Array.isArray(linked) ? linked[0] : linked;
    const name = product?.name ?? row.product_id.slice(0, 8);
    const prev = productSales.get(row.product_id) ?? { name, qty: 0, revenue: 0 };
    prev.qty += Number(row.quantity);
    prev.revenue += Number(row.total_price);
    productSales.set(row.product_id, prev);
  }

  const topProducts = [...productSales.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  const byEvent = new Map<string, number>();
  for (const sale of normalizedSales) {
    const ev = sale.event_name?.trim() || "Senza evento";
    byEvent.set(ev, (byEvent.get(ev) ?? 0) + sale.total_amount);
  }

  return {
    sales: normalizedSales,
    revenue,
    outflowTotal,
    estimatedProfit: revenue - outflowTotal,
    byAccount: [...byAccount.entries()].map(([id, v]) => ({ accountId: id, ...v })),
    topProducts,
    byEvent: [...byEvent.entries()].map(([event, total]) => ({ event, total })),
  };
}
