import { redirect } from "next/navigation";
import { getRequestAuthContext } from "@/utils/supabase/request-auth-context";

export const dynamic = "force-dynamic";

export default async function GeneratorLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getRequestAuthContext();
  if (!user) redirect("/login");
  if (profile?.role !== "gm" && profile?.role !== "admin") redirect("/dashboard");
  return children;
}
