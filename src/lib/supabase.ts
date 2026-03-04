// 後方互換性のために残す - 新しいコードでは @/lib/supabase/client を使用してください
import { createClient } from '@/lib/supabase/client';

export const supabase = createClient();
