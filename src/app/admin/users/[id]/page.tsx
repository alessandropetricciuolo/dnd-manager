import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EditUserDialog } from "@/components/admin/edit-user-dialog";
import { DeleteUserButton } from "@/components/admin/delete-user-button";
import { ArrowLeft, Shield, Gamepad2, Users } from "lucide-react";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(iso: string) {
  return format(new Date(iso), "dd MMMM yyyy", { locale: it });
}

function formatDateTime(iso: string) {
  return format(new Date(iso), "dd MMM yyyy, HH:mm", { locale: it });
}

type CampaignType = "oneshot" | "quest" | "long" | null;

function CampaignTypeBadge({ type }: { type: CampaignType }) {
  if (!type) return <Badge variant="secondary" className="bg-slate-600/50 text-slate-400">—</Badge>;
  const config = {
    oneshot: { label: "Oneshot", className: "bg-blue-500/20 text-blue-300" },
    quest: { label: "Quest", className: "bg-purple-500/20 text-purple-300" },
    long: { label: "Long", className: "bg-orange-500/20 text-orange-300" },
  };
  const c = config[type as keyof typeof config] ?? { label: type, className: "bg-slate-600/50 text-slate-400" };
  return <Badge className={c.className}>{c.label}</Badge>;
}

export default async function AdminUserDossierPage({ params }: PageProps) {
  const { id: userId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (!currentUser) notFound();

  const admin = createSupabaseAdminClient();
  const { data: myProfileRaw } = await admin
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single();
  const myProfile = myProfileRaw as { role?: string } | null;

  if (myProfile?.role !== "admin") notFound();

  const { data: profileRaw } = await admin
    .from("profiles")
    .select("id, first_name, last_name, role, phone, created_at")
    .eq("id", userId)
    .single();
  const profile = profileRaw as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
    phone: string | null;
    created_at: string;
  } | null;

  if (!profile) notFound();

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? "—";

  const { data: signupsRaw } = await admin
    .from("session_signups")
    .select(
      `
      id,
      status,
      signed_up_at,
      sessions (
        id,
        scheduled_at,
        title,
        notes,
        campaign_id,
        dm_id,
        campaigns (
          name,
          type
        )
      )
    `
    )
    .eq("player_id", userId)
    .order("signed_up_at", { ascending: false });

  type SessionRow = {
    id: string;
    scheduled_at: string;
    title: string | null;
    notes: string | null;
    campaign_id: string;
    dm_id: string | null;
    campaigns: { name: string; type: CampaignType } | null;
  };
  type SignupRow = {
    id: string;
    status: string;
    signed_up_at: string;
    sessions: SessionRow | null;
  };
  const signups = (signupsRaw ?? []) as SignupRow[];

  const signupsList = signups.map((s) => {
    const session = s.sessions;
    return {
      id: s.id,
      status: s.status,
      signed_up_at: s.signed_up_at,
      scheduled_at: session?.scheduled_at ?? "",
      session_title: session?.title || session?.notes || "Sessione",
      campaign_name: session?.campaigns?.name ?? "—",
      campaign_type: session?.campaigns?.type ?? null,
      dm_id: session?.dm_id ?? null,
    };
  });

  const dmIds = Array.from(new Set(signupsList.map((s) => s.dm_id).filter(Boolean))) as string[];
  const { data: dmProfilesRaw } = dmIds.length > 0
    ? await admin.from("profiles").select("id, first_name, last_name, display_name").in("id", dmIds)
    : { data: [] };
  type DmProfileRow = { id: string; first_name: string | null; last_name: string | null; display_name: string | null };
  const dmProfiles = (dmProfilesRaw ?? []) as DmProfileRow[];
  const dmNames = new Map(
    dmProfiles.map((p) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ").trim() || p.display_name?.trim() || `Utente ${p.id.slice(0, 8)}`;
      return [p.id, name];
    })
  );

  const sessioniGiocate = signupsList.filter((s) => s.status === "attended").length;
  const assenze = signupsList.filter((s) => s.status === "absent").length;
  const totalWithPresence = sessioniGiocate + assenze;
  const affidabilitaPct =
    totalWithPresence > 0 ? Math.round((sessioniGiocate / totalWithPresence) * 100) : null;

  const isGmOrAdmin = profile.role === "gm" || profile.role === "admin";

  const { data: campaignsCreatedRaw } = await admin
    .from("campaigns")
    .select("id, name, type, created_at")
    .eq("gm_id", userId)
    .order("created_at", { ascending: false });
  type CampaignRow = { id: string; name: string; type: CampaignType | null; created_at: string };
  const campaignsCreated = (campaignsCreatedRaw ?? []) as CampaignRow[];

  const { data: sessionsMasterateRaw } = await admin
    .from("sessions")
    .select("id, scheduled_at, title, campaign_id, status")
    .eq("dm_id", userId)
    .order("scheduled_at", { ascending: false });
  type SessionMasterRow = { id: string; scheduled_at: string; title: string | null; campaign_id: string; status: string };
  const sessionsMasterateList = (sessionsMasterateRaw ?? []) as SessionMasterRow[];
  const sessioniMasterateCount = sessionsMasterateList.filter((s) => s.status === "completed").length;
  const campaignIdsForMaster = Array.from(new Set(sessionsMasterateList.map((s) => s.campaign_id)));
  const { data: campaignsForMasterRaw } = campaignIdsForMaster.length > 0
    ? await admin.from("campaigns").select("id, name").in("id", campaignIdsForMaster)
    : { data: [] };
  const campaignsForMaster = (campaignsForMasterRaw ?? []) as { id: string; name: string }[];
  const campaignNamesMaster = new Map(campaignsForMaster.map((c) => [c.id, c.name]));

  const presentCounts = await Promise.all(
    sessionsMasterateList.map(async (s) => {
      const { count } = await admin
        .from("session_signups")
        .select("id", { count: "exact", head: true })
        .eq("session_id", s.id)
        .eq("status", "attended");
      return { sessionId: s.id, presentCount: count ?? 0 };
    })
  );
  const presentBySession = new Map(presentCounts.map((p) => [p.sessionId, p.presentCount]));

  return (
    <div className="min-h-screen bg-barber-dark px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-barber-paper/80 hover:text-barber-paper">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-barber-paper sm:text-2xl">
              <Shield className="h-6 w-6 text-barber-gold" />
              Dossier utente
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <EditUserDialog
              userId={userId}
              defaultValues={{
                email: email === "—" ? "" : email,
                first_name: profile.first_name,
                last_name: profile.last_name,
                phone: profile.phone,
                role: profile.role,
              }}
            />
            <DeleteUserButton
              userId={userId}
              userLabel={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || email || `Utente ${userId.slice(0, 8)}`}
              redirectAfter
            />
          </div>
        </header>

        <Card className="border-barber-gold/40 bg-barber-dark/90">
          <CardHeader>
            <CardTitle className="text-barber-paper">Dati anagrafici</CardTitle>
            <CardDescription className="text-barber-paper/70">
              Profilo e informazioni di contatto
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-barber-paper/60">Nome</p>
              <p className="text-barber-paper">{profile.first_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-barber-paper/60">Cognome</p>
              <p className="text-barber-paper">{profile.last_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-barber-paper/60">Ruolo</p>
              <p className="text-barber-paper capitalize">{profile.role}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-barber-paper/60">Email</p>
              <p className="text-barber-paper">{email}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-barber-paper/60">Telefono</p>
              <p className="text-barber-paper">{profile.phone ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="giocatore" className="w-full">
          <TabsList className="mb-6 w-full justify-start rounded-xl border border-barber-gold/40 bg-barber-dark/90 p-1">
            <TabsTrigger
              value="giocatore"
              className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
            >
              <Gamepad2 className="mr-2 h-4 w-4" />
              Giocatore
            </TabsTrigger>
            {isGmOrAdmin && (
              <TabsTrigger
                value="master"
                className="data-[state=active]:bg-barber-gold/20 data-[state=active]:text-barber-gold"
              >
                <Users className="mr-2 h-4 w-4" />
                Master
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="giocatore" className="mt-0 space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-barber-gold/40 bg-barber-dark/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-barber-paper/70">
                    Sessioni giocate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-barber-gold">{sessioniGiocate}</p>
                </CardContent>
              </Card>
              <Card className="border-barber-gold/40 bg-barber-dark/90">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-barber-paper/70">Assenze</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-red-400">{assenze}</p>
                </CardContent>
              </Card>
              <Card className="border-emerald-700/50 bg-slate-950/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Affidabilità
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-slate-50">
                    {affidabilitaPct !== null ? `${affidabilitaPct}%` : "—"}
                  </p>
                  <p className="text-xs text-slate-500">Giocate / (Giocate + Assenze)</p>
                </CardContent>
              </Card>
            </div>

            {totalWithPresence > 0 && affidabilitaPct !== null && (
              <Card className="border-emerald-700/50 bg-slate-950/70">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    Barra affidabilità
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${affidabilitaPct}%`,
                        backgroundColor:
                          affidabilitaPct > 90
                            ? "rgb(52 211 153)"
                            : affidabilitaPct > 50
                              ? "rgb(250 204 21)"
                              : "rgb(248 113 113)",
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-emerald-700/50 bg-slate-950/70 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-slate-50">Storico sessioni</CardTitle>
                <CardDescription className="text-slate-400">
                  Sessioni a cui si è iscritto con Data, Campagna (tipo), Sessione, DM, Stato presenza
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {signupsList.length === 0 ? (
                  <p className="px-6 py-8 text-center text-slate-400">
                    Nessuna sessione in storico.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-emerald-700/40 hover:bg-transparent">
                        <TableHead className="text-slate-300">Data</TableHead>
                        <TableHead className="text-slate-300">Campagna</TableHead>
                        <TableHead className="text-slate-300">Sessione</TableHead>
                        <TableHead className="text-slate-300">DM</TableHead>
                        <TableHead className="text-slate-300">Stato presenza</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {signupsList.map((row) => (
                        <TableRow
                          key={row.id}
                          className="border-emerald-700/30 hover:bg-slate-800/50"
                        >
                          <TableCell className="text-slate-300">
                            {row.scheduled_at ? formatDateTime(row.scheduled_at) : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-slate-300">{row.campaign_name}</span>
                              <CampaignTypeBadge type={row.campaign_type} />
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">{row.session_title}</TableCell>
                          <TableCell className="text-slate-300">
                            {row.dm_id ? dmNames.get(row.dm_id) ?? "—" : "—"}
                          </TableCell>
                          <TableCell>
                            {row.status === "attended" ? (
                              <Badge className="bg-emerald-500/20 text-emerald-300">
                                Presente
                              </Badge>
                            ) : row.status === "absent" ? (
                              <Badge className="bg-red-500/20 text-red-300">Assente</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-slate-600/50 text-slate-400">
                                {row.status === "pending"
                                  ? "Pending"
                                  : row.status === "approved"
                                    ? "Approvato"
                                    : String(row.status)}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isGmOrAdmin && (
            <TabsContent value="master" className="mt-0 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-emerald-700/50 bg-slate-950/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">
                      Campagne create / scritte
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-slate-50">
                      {campaignsCreated?.length ?? 0}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-emerald-700/50 bg-slate-950/70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-400">
                      Sessioni masterate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-slate-50">
                      {sessioniMasterateCount}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-emerald-700/50 bg-slate-950/70 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-slate-50">Campagne create</CardTitle>
                  <CardDescription className="text-slate-400">
                    Campagne dove gm_id = utente
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {!campaignsCreated?.length ? (
                    <p className="px-6 py-8 text-center text-slate-400">Nessuna campagna.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-emerald-700/40 hover:bg-transparent">
                          <TableHead className="text-slate-300">Nome</TableHead>
                          <TableHead className="text-slate-300">Tipo</TableHead>
                          <TableHead className="text-slate-300">Data creazione</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campaignsCreated.map((c) => (
                          <TableRow
                            key={c.id}
                            className="border-emerald-700/30 hover:bg-slate-800/50"
                          >
                            <TableCell className="font-medium text-slate-100">{c.name}</TableCell>
                            <TableCell>
                              <CampaignTypeBadge type={c.type as CampaignType} />
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {formatDate(c.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card className="border-emerald-700/50 bg-slate-950/70 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-slate-50">Sessioni masterate</CardTitle>
                  <CardDescription className="text-slate-400">
                    Sessioni dove dm_id = utente (Data, Campagna, Titolo, N. giocatori presenti)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {sessionsMasterateList.length === 0 ? (
                    <p className="px-6 py-8 text-center text-slate-400">Nessuna sessione.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-emerald-700/40 hover:bg-transparent">
                          <TableHead className="text-slate-300">Data</TableHead>
                          <TableHead className="text-slate-300">Campagna</TableHead>
                          <TableHead className="text-slate-300">Titolo</TableHead>
                          <TableHead className="text-slate-300 text-right">N. presenti</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionsMasterateList.map((s) => (
                          <TableRow
                            key={s.id}
                            className="border-emerald-700/30 hover:bg-slate-800/50"
                          >
                            <TableCell className="text-slate-300">
                              {formatDateTime(s.scheduled_at)}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {campaignNamesMaster.get(s.campaign_id) ?? "—"}
                            </TableCell>
                            <TableCell className="text-slate-300">
                              {s.title || "Sessione"}
                            </TableCell>
                            <TableCell className="text-right text-slate-300">
                              {presentBySession.get(s.id) ?? 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
