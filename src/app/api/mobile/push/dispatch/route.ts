import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { type PushDispatchDependencies } from "@/lib/mobile/push-dispatch";
import { createPushDispatchGetHandler } from "@/lib/mobile/push-dispatch-http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function sendExpo(path: "send" | "getReceipts", body: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`ExpoHTTP${response.status}`);
  return response.json();
}

function createDependencies(): PushDispatchDependencies {
  const admin: any = createSupabaseAdminClient();
  const db = admin as any;
  return {
    listReceiptJobs: async (cutoff) => {
      const { data, error } = await db.from("mobile_push_jobs").select("id,token,user_id,ticket_id,sent_at")
        .eq("status", "ticket").lte("sent_at", cutoff).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    fetchReceipts: async (ids) => {
      const response = await sendExpo("getReceipts", { ids });
      return response.data ?? {};
    },
    claimJobs: async (limit) => {
      const { data, error } = await db.rpc("claim_mobile_push_jobs", { p_limit: limit });
      if (error) throw error;
      return data ?? [];
    },
    getPreferences: async (job) => {
      const [{ data: device, error: deviceError }, { data: profile, error: profileError }] = await Promise.all([
        db.from("mobile_push_devices").select("enabled,whispers,sessions").eq("token", job.token).eq("user_id", job.user_id).maybeSingle(),
        db.from("profiles").select("notifications_disabled").eq("id", job.user_id).maybeSingle(),
      ]);
      if (deviceError || profileError) throw new Error("PushPreferencesReadFailed");
      return {
        enabled: Boolean(device?.enabled), whispers: Boolean(device?.whispers), sessions: Boolean(device?.sessions),
        notificationsDisabled: !profile || Boolean(profile.notifications_disabled),
      };
    },
    isEligible: async (jobId) => {
      const { data, error } = await db.rpc("mobile_push_job_is_eligible", { p_job_id: jobId });
      if (error) throw error;
      return data === true;
    },
    send: async (payload) => {
      const response = await sendExpo("send", [payload]);
      return response.data?.[0];
    },
    disableDevice: async (userId, token) => {
      const { error } = await db.from("mobile_push_devices").update({ enabled: false }).eq("token", token).eq("user_id", userId);
      if (error) throw new Error("PushDeviceDisableFailed");
    },
    updateJob: async (id, patch) => {
      const { error } = await db.from("mobile_push_jobs").update(patch).eq("id", id);
      if (error) throw new Error("PushJobUpdateFailed");
    },
  };
}

export const GET = createPushDispatchGetHandler(() => process.env.CRON_SECRET, createDependencies);
