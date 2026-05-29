type UserLike = {
  email?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
  } | null;
};

export function getUserDisplayName(user: UserLike): string {
  const meta = user.user_metadata;
  const first = (meta?.first_name ?? "").trim();
  const last = (meta?.last_name ?? "").trim();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  if (meta?.display_name?.trim()) return meta.display_name.trim();
  if (user.email) return user.email.split("@")[0] ?? "avventuriero";
  return "avventuriero";
}
