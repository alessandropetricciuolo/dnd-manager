"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { requireVaultAccess, requireVaultAdmin } from "@/lib/vault/access";
import type { VaultAccountMovementType, VaultAccountType } from "@/lib/vault/types";

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

const VAULT_PATHS = ["/vault", "/vault/conti", "/vault/accessi"];

function revalidateVault() {
  for (const p of VAULT_PATHS) revalidatePath(p);
}

// ---------- Accessi ----------

export async function grantVaultAccessAction(userId: string, note?: string): Promise<ActionResult> {
  const ctx = await requireVaultAdmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("vault_access").upsert(
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
  revalidateVault();
  return { success: true };
}

export async function revokeVaultAccessAction(userId: string): Promise<ActionResult> {
  await requireVaultAdmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("vault_access")
    .update({ enabled: false, revoked_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  revalidateVault();
  return { success: true };
}

// ---------- Conti ----------

export async function upsertVaultAccountAction(input: {
  id?: string;
  name: string;
  type: VaultAccountType;
  opening_balance: number;
  active: boolean;
  note?: string;
}): Promise<ActionResult<{ id: string }>> {
  await requireVaultAccess();
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
    const { error } = await supabase.from("vault_accounts").update(payload).eq("id", input.id);
    if (error) return { success: false, error: error.message };
    revalidateVault();
    return { success: true, data: { id: input.id } };
  }

  const { data, error } = await supabase
    .from("vault_accounts")
    .insert({ ...payload, created_at: now })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateVault();
  return { success: true, data: { id: data.id } };
}

export async function createVaultAccountMovementAction(input: {
  account_id: string;
  type: VaultAccountMovementType;
  amount: number;
  reason?: string;
  category?: string;
  movement_date?: string;
}): Promise<ActionResult> {
  await requireVaultAccess();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let amount = input.amount;
  if (input.type === "uscita" && amount > 0) amount = -amount;
  if (input.type === "entrata" && amount < 0) amount = Math.abs(amount);

  const { error } = await supabase.from("vault_account_movements").insert({
    account_id: input.account_id,
    type: input.type,
    amount,
    reason: input.reason?.trim() || null,
    category: input.category?.trim() || null,
    movement_date: input.movement_date || new Date().toISOString(),
    created_by: user?.id ?? null,
  });

  if (error) return { success: false, error: error.message };
  revalidateVault();
  return { success: true };
}

export async function createVaultTransferAction(input: {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  note?: string;
  movement_date?: string;
}): Promise<ActionResult> {
  await requireVaultAccess();
  const amount = Math.abs(input.amount);
  if (!amount) return { success: false, error: "Importo obbligatorio." };
  if (input.from_account_id === input.to_account_id) {
    return { success: false, error: "Seleziona due conti diversi." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: accounts } = await supabase
    .from("vault_accounts")
    .select("id, name, active")
    .in("id", [input.from_account_id, input.to_account_id]);

  const fromAccount = accounts?.find((a) => a.id === input.from_account_id);
  const toAccount = accounts?.find((a) => a.id === input.to_account_id);
  if (!fromAccount?.active || !toAccount?.active) {
    return { success: false, error: "Conti non validi o disattivati." };
  }

  const movementDate = input.movement_date || new Date().toISOString();
  const note = input.note?.trim() || null;

  const { data: outMovement, error: outErr } = await supabase
    .from("vault_account_movements")
    .insert({
      account_id: input.from_account_id,
      type: "uscita",
      amount: -amount,
      reason: note ? `Giroconto verso ${toAccount.name} — ${note}` : `Giroconto verso ${toAccount.name}`,
      category: "giroconto",
      movement_date: movementDate,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (outErr) return { success: false, error: outErr.message };

  const { error: inErr } = await supabase.from("vault_account_movements").insert({
    account_id: input.to_account_id,
    type: "entrata",
    amount,
    reason: note ? `Giroconto da ${fromAccount.name} — ${note}` : `Giroconto da ${fromAccount.name}`,
    category: "giroconto",
    movement_date: movementDate,
    created_by: user?.id ?? null,
  });
  if (inErr) {
    await supabase.from("vault_account_movements").delete().eq("id", outMovement.id);
    return { success: false, error: inErr.message };
  }

  revalidateVault();
  return { success: true };
}

// ---------- Query ----------

export async function fetchVaultDashboardData() {
  await requireVaultAccess();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: accounts }, { data: balances }, { data: movements }, { data: monthMovements }] =
    await Promise.all([
      supabase.from("vault_accounts").select("id, name, type, active").eq("active", true).order("name"),
      supabase.from("vault_account_balances").select("account_id, balance"),
      supabase
        .from("vault_account_movements")
        .select("id, account_id, type, amount, reason, category, movement_date")
        .order("movement_date", { ascending: false })
        .limit(12),
      supabase
        .from("vault_account_movements")
        .select("type, amount")
        .gte("movement_date", monthStart),
    ]);

  const balanceMap = new Map((balances ?? []).map((b) => [b.account_id, Number(b.balance)]));
  const accountsWithBalance = (accounts ?? []).map((a) => ({
    ...a,
    balance: balanceMap.get(a.id) ?? 0,
  }));
  const totalBalance = accountsWithBalance.reduce((s, a) => s + a.balance, 0);

  let monthIn = 0;
  let monthOut = 0;
  for (const m of monthMovements ?? []) {
    if (m.type === "entrata") monthIn += Number(m.amount);
    else if (m.type === "uscita") monthOut += Math.abs(Number(m.amount));
    else if (m.type === "correzione" && Number(m.amount) > 0) monthIn += Number(m.amount);
    else if (m.type === "correzione" && Number(m.amount) < 0) monthOut += Math.abs(Number(m.amount));
  }

  return {
    accounts: accountsWithBalance,
    totalBalance,
    monthIn,
    monthOut,
    monthNet: monthIn - monthOut,
    recentMovements: movements ?? [],
  };
}

export async function fetchVaultAccountsWithBalances(activeOnly = false) {
  await requireVaultAccess();
  const supabase = await createSupabaseServerClient();

  let q = supabase.from("vault_accounts").select("*").order("name");
  if (activeOnly) q = q.eq("active", true);

  const [{ data: accounts }, { data: balances }] = await Promise.all([
    q,
    supabase.from("vault_account_balances").select("account_id, balance"),
  ]);

  const balanceMap = new Map((balances ?? []).map((b) => [b.account_id, Number(b.balance)]));

  return (accounts ?? []).map((a) => ({
    ...a,
    balance: balanceMap.get(a.id) ?? Number(a.opening_balance),
  }));
}

export async function fetchVaultAccountMovements(accountId: string) {
  await requireVaultAccess();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("vault_account_movements")
    .select("*")
    .eq("account_id", accountId)
    .order("movement_date", { ascending: false })
    .limit(200);

  return data ?? [];
}

export async function fetchVaultRecentMovements(limit = 50) {
  await requireVaultAccess();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("vault_account_movements")
    .select("*, vault_accounts(name)")
    .order("movement_date", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const linked = (row as { vault_accounts?: { name: string } | { name: string }[] }).vault_accounts;
    const account = Array.isArray(linked) ? linked[0] : linked;
    return {
      ...row,
      account_name: account?.name ?? "—",
    };
  });
}
