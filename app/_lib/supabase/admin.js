import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "./env";

let adminClient = null;

export function createSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();

  adminClient = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
