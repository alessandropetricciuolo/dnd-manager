"use client";

import { useState, Suspense } from "react";
import { MissionBoard, type PersonalMission, type LinkedWikiEntity } from "@/components/missions/mission-board";

const INITIAL_ORG_MISSIONS = [
  {
    id: "org-1",
    grade: "C",
    title: "Bando dei Goblin del Fiume",
    committente: "Egida",
    ubicazione: "Fiume Silente",
    paga: "50 mo",
    urgenza: "Media",
    description: "Eliminare la banda di goblin che saccheggia le chiatte.",
    status: "open",
    points_reward: 2,
    mission_kind: "organization" as const,
  },
];

const INITIAL_PERSONAL_MISSIONS: PersonalMission[] = [
  {
    id: "pers-1",
    title: "Incontro Segreto al Molo",
    description: "Contatto con la spia dei ribelli per raccogliere informazioni sulle trame cittadine.",
    committente: "Informatore Cieco",
    ubicazione: "Moli Vecchi",
    urgenza: "Alta",
    status: "open",
  },
  {
    id: "pers-2",
    title: "Indagine sulle Ombre",
    description: "Tracce di magia proibita rinvenute nelle catacombe inferiori.",
    committente: null,
    ubicazione: "Catacombe",
    urgenza: null,
    status: "in_progress",
  },
];

const INITIAL_LINKED_WIKI: LinkedWikiEntity[] = [
  {
    id: "wiki-1",
    name: "Informatore Cieco",
    type: "npc",
    linked_mission_id: "pers-1",
  },
  {
    id: "wiki-2",
    name: "Catacombe Inferiori",
    type: "location",
    linked_mission_id: "pers-2",
  },
];

const INITIAL_GUILDS = [
  {
    id: "guild-1",
    name: "Compagnia del Grifone",
    rank: "C",
    score: 120,
    auto_rank: true,
  },
];

export default function TestMissionsUiPage() {
  const [role, setRole] = useState<"admin" | "foreign_gm" | "player" | "projection">("foreign_gm");
  const [personalMissions, setPersonalMissions] = useState<PersonalMission[]>(INITIAL_PERSONAL_MISSIONS);

  const isGmOrAdmin = role === "admin" || role === "foreign_gm";
  const isAdmin = role === "admin";
  const isProjection = role === "projection";
  const canManagePersonal = (role === "admin" || role === "foreign_gm") && !isProjection;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Test Controls Bar */}
      <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-lg flex flex-wrap items-center gap-4 text-xs font-mono">
        <span className="font-bold text-amber-400 uppercase">Test Role Selector:</span>
        <button
          id="btn-role-foreign-gm"
          type="button"
          onClick={() => setRole("foreign_gm")}
          className={`px-3 py-1 rounded border ${role === "foreign_gm" ? "bg-amber-600 text-black font-bold" : "bg-zinc-800 text-zinc-300"}`}
        >
          GM Estraneo (Non proprietario)
        </button>
        <button
          id="btn-role-admin"
          type="button"
          onClick={() => setRole("admin")}
          className={`px-3 py-1 rounded border ${role === "admin" ? "bg-amber-600 text-black font-bold" : "bg-zinc-800 text-zinc-300"}`}
        >
          Admin
        </button>
        <button
          id="btn-role-player"
          type="button"
          onClick={() => setRole("player")}
          className={`px-3 py-1 rounded border ${role === "player" ? "bg-amber-600 text-black font-bold" : "bg-zinc-800 text-zinc-300"}`}
        >
          Giocatore
        </button>
        <button
          id="btn-role-projection"
          type="button"
          onClick={() => setRole("projection")}
          className={`px-3 py-1 rounded border ${role === "projection" ? "bg-amber-600 text-black font-bold" : "bg-zinc-800 text-zinc-300"}`}
        >
          Proiezione Giocatori
        </button>

        <span className="ml-auto text-zinc-400">
          Ruolo attivo: <strong className="text-white">{role}</strong> | canManagePersonal: <strong>{String(canManagePersonal)}</strong>
        </span>
      </div>

      {/* The Actual Component Under Test */}
      <Suspense fallback={<div>Caricamento...</div>}>
        <MissionBoard
          campaignId="test-campaign-1"
          missions={INITIAL_ORG_MISSIONS}
          guilds={INITIAL_GUILDS}
          isGmOrAdmin={isGmOrAdmin}
          isAdmin={isAdmin}
          isProjection={isProjection}
          personalMissions={canManagePersonal ? personalMissions : []}
          linkedWikiEntities={canManagePersonal ? INITIAL_LINKED_WIKI : []}
          canManagePersonalMissions={canManagePersonal}
        />
      </Suspense>
    </div>
  );
}
