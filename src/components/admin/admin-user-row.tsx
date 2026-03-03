"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RoleSelect } from "@/components/admin/role-select";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  role: string;
  created_at: string;
};

function displayUserLabel(profile: Profile) {
  const full = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (profile.display_name?.trim()) return profile.display_name.trim();
  return `Utente ${profile.id.slice(0, 8)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function AdminUserRow({ profile }: { profile: Profile }) {
  const router = useRouter();

  return (
    <TableRow
      role="button"
      tabIndex={0}
      className="cursor-pointer border-emerald-700/30 hover:bg-slate-800/50 focus:bg-slate-800/50"
      onClick={() => router.push(`/admin/users/${profile.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/admin/users/${profile.id}`);
        }
      }}
    >
      <TableCell className="font-medium text-slate-100">
        {displayUserLabel(profile)}
      </TableCell>
      <TableCell className="text-slate-300">
        {profile.first_name ?? "—"}
      </TableCell>
      <TableCell className="text-slate-300">
        {profile.last_name ?? "—"}
      </TableCell>
      <TableCell className="text-slate-300 capitalize">
        {profile.role}
      </TableCell>
      <TableCell className="text-slate-400">
        {formatDate(profile.created_at)}
      </TableCell>
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/users/${profile.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-700/50 text-slate-200 hover:bg-emerald-500/10"
            >
              Vedi Dossier
            </Button>
          </Link>
          <RoleSelect userId={profile.id} currentRole={profile.role} />
        </div>
      </TableCell>
    </TableRow>
  );
}
