import { fetchForgeAccountsWithBalances, fetchForgeReportData } from "@/lib/forge/actions";
import { ForgeReportClient, defaultFrom } from "@/components/forge/forge-report-client";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function ForgeReportPage({ searchParams }: Props) {
  const sp = await searchParams;
  const from = sp.from ?? defaultFrom();
  const to = sp.to ?? new Date().toISOString().slice(0, 10);
  const [data, accounts] = await Promise.all([
    fetchForgeReportData(`${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`),
    fetchForgeAccountsWithBalances(true),
  ]);

  return (
    <ForgeReportClient initialData={data} initialFrom={from} initialTo={to} accounts={accounts} />
  );
}
