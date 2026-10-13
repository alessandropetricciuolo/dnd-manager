import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createMobilePushDeviceHandlers } from "@/lib/mobile/push-device-http";

const handlers = createMobilePushDeviceHandlers(() => {
  const admin: any = createSupabaseAdminClient();
  return {
    getUser: async (accessToken: string) => {
      const { data, error } = await admin.auth.getUser(accessToken);
      return error || !data.user ? null : { id: data.user.id };
    },
    upsertDevice: async (userId, device) => {
      const { error } = await admin.from("mobile_push_devices" as never).upsert({
        ...device, user_id: userId, updated_at: new Date().toISOString(),
      } as never, { onConflict: "token" });
      if (error) throw error;
    },
    deleteDevice: async (userId, token) => {
      const { error } = await admin.from("mobile_push_devices" as never).delete().eq("user_id", userId).eq("token", token);
      if (error) throw error;
    },
  };
});

export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
