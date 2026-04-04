import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function getServerSupabaseConfigError(): string | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return "Supabase URL is missing. Set NEXT_PUBLIC_SUPABASE_URL.";
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return "Supabase anon key is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  }

  return null;
}

export async function createClient() {
  const configError = getServerSupabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component からの呼び出し時は set が使えないため無視
            // ミドルウェアでセッションリフレッシュが処理される
          }
        },
      },
    }
  );
}
