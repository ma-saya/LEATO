-- ======================================================
-- StackLog 認証マイグレーション
-- Supabase SQL Editor で実行してください
-- ======================================================

-- 1. 各テーブルに user_id 列を追加
ALTER TABLE public.sl_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.sl_todos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.sl_settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. sl_settings の主キーを user_id に変更するための準備
-- （既存の 'current' ベースの主キーを user_id ベースに移行）
-- 注意: 既存の 'current' レコードがある場合は手動でユーザーIDを設定してください

-- 3. 既存の RLS ポリシーを削除
DROP POLICY IF EXISTS "Allow all on sl_logs" ON public.sl_logs;
DROP POLICY IF EXISTS "Allow all on sl_todos" ON public.sl_todos;
DROP POLICY IF EXISTS "Allow all on sl_settings" ON public.sl_settings;

-- 4. 新しい RLS ポリシーを作成
-- ログイン済み → 自分のデータのみ
-- 未ログイン → user_id が NULL のデータのみ

-- sl_logs
CREATE POLICY "Users can view own logs" ON public.sl_logs
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can insert own logs" ON public.sl_logs
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update own logs" ON public.sl_logs
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can delete own logs" ON public.sl_logs
  FOR DELETE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

-- sl_todos
CREATE POLICY "Users can view own todos" ON public.sl_todos
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can insert own todos" ON public.sl_todos
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update own todos" ON public.sl_todos
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can delete own todos" ON public.sl_todos
  FOR DELETE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

-- sl_settings
CREATE POLICY "Users can view own settings" ON public.sl_settings
  FOR SELECT USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can insert own settings" ON public.sl_settings
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can update own settings" ON public.sl_settings
  FOR UPDATE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

CREATE POLICY "Users can delete own settings" ON public.sl_settings
  FOR DELETE USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

-- 5. user_id 列にインデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_sl_logs_user_id ON public.sl_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sl_todos_user_id ON public.sl_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_sl_settings_user_id ON public.sl_settings(user_id);
