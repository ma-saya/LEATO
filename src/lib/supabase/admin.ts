import { createClient } from "@supabase/supabase-js";

export function getAdminSupabaseConfigError(): string | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return "Supabase URL is missing. Set NEXT_PUBLIC_SUPABASE_URL.";
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return "Supabase service role key is missing. Set SUPABASE_SERVICE_ROLE_KEY.";
  }

  return null;
}

export function createAdminClient() {
  const configError = getAdminSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
