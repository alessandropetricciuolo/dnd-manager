export type ForgePaymentStatus = "pagato" | "da_pagare" | "parziale";
export type ForgeInventoryMovementType = "produzione" | "vendita" | "scarto" | "reso" | "correzione";
export type ForgeAccountMovementType = "entrata" | "uscita" | "correzione";
export type ForgeAccountType = "contanti" | "banca" | "paypal" | "satispay" | "altro";

export type ForgeProduct = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  cost_estimate: number;
  sale_price: number;
  min_stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  stock?: number;
};

export type ForgeAccount = {
  id: string;
  name: string;
  type: ForgeAccountType;
  opening_balance: number;
  active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
  balance?: number;
};

export type ForgeSaleItemInput = {
  product_id: string;
  quantity: number;
  unit_price: number;
};

export type ForgeSale = {
  id: string;
  sale_date: string;
  payment_status: ForgePaymentStatus;
  customer_name: string | null;
  event_name: string | null;
  account_id: string;
  total_amount: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

export type ForgeInventoryMovement = {
  id: string;
  product_id: string;
  type: ForgeInventoryMovementType;
  quantity: number;
  note: string | null;
  sale_id: string | null;
  created_by: string | null;
  created_at: string;
  product_name?: string;
};

export type ForgeAccountMovement = {
  id: string;
  account_id: string;
  type: ForgeAccountMovementType;
  amount: number;
  reason: string | null;
  category: string | null;
  linked_sale_id: string | null;
  created_by: string | null;
  movement_date: string;
  created_at: string;
};

export type ForgeAccessRow = {
  id: string;
  user_id: string;
  enabled: boolean;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  note: string | null;
};

export type ForgeGmUser = {
  id: string;
  label: string;
  role: string;
  forge_access: ForgeAccessRow | null;
};
