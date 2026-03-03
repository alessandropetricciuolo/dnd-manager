"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole } from "@/app/admin/actions";

const ROLES = [
  { value: "player", label: "Player" },
  { value: "gm", label: "GM" },
  { value: "admin", label: "Admin" },
] as const;

type RoleSelectProps = {
  userId: string;
  currentRole: string;
};

export function RoleSelect({ userId, currentRole }: RoleSelectProps) {
  const [isPending, startTransition] = useTransition();

  function onValueChange(newRole: string) {
    if (newRole === currentRole) return;
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Select
      value={currentRole}
      onValueChange={onValueChange}
      disabled={isPending}
    >
      <SelectTrigger className="w-[130px] border-slate-600 bg-slate-900/70 text-slate-100">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="border-slate-700 bg-slate-900">
        {ROLES.map(({ value, label }) => (
          <SelectItem
            key={value}
            value={value}
            className="text-slate-100 focus:bg-emerald-500/20 focus:text-slate-50"
          >
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
