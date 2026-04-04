// 後方互換性のために残す - 新しいコードでは @/lib/supabase/client を使用してください
import { createClient } from '@/lib/supabase/client';

type SupabaseClientInstance = ReturnType<typeof createClient>;

let browserClient: SupabaseClientInstance | null = null;

export function getSupabaseClient(): SupabaseClientInstance {
  if (!browserClient) {
    browserClient = createClient();
  }

  return browserClient;
}

export const supabase = new Proxy({} as SupabaseClientInstance, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClientInstance];

    return typeof value === "function" ? value.bind(client) : value;
  },
});
