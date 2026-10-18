import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getWikiGeographyData } from "@/app/campaigns/wiki-geography-actions";
import { WikiGeography } from "@/components/gm/wiki-geography";

export const dynamic = "force-dynamic";

export default async function WikiGeographyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") notFound();
  const result = await getWikiGeographyData(id);

  return (
    <div className="mx-auto w-full max-w-[1600px] min-w-0 px-3 py-5 sm:px-6 lg:px-8">
      <WikiGeography campaignId={id} initialData={result.success ? result.data : null} initialError={result.success ? null : result.error} />
    </div>
  );
}
