export type VaultAccountMovementType = "entrata" | "uscita" | "correzione";
export type VaultAccountType = "contanti" | "banca" | "paypal" | "satispay" | "altro";

export type VaultAccount = {
  id: string;
  name: string;
  type: VaultAccountType;
  opening_balance: number;
  active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
  balance?: number;
};

export type VaultAccountMovement = {
  id: string;
  account_id: string;
  type: VaultAccountMovementType;
  amount: number;
  reason: string | null;
  category: string | null;
  created_by: string | null;
  movement_date: string;
  created_at: string;
};

export type VaultAccessRow = {
  id: string;
  user_id: string;
  enabled: boolean;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  note: string | null;
};

export type VaultGmUser = {
  id: string;
  label: string;
  role: string;
  vault_access: VaultAccessRow | null;
};
