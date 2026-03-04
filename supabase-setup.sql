-- StackLog テーブル作成 SQL
-- Supabase SQL Editor (https://supabase.com/dashboard/project/dyrjpebsrfuiwvigloas/sql/new) で実行してください

-- 1. sl_logs テーブル
CREATE TABLE IF NOT EXISTS public.sl_logs (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  did TEXT NOT NULL,
  learned TEXT,
  next TEXT,
  minutes INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'その他',
  tags TEXT[] DEFAULT '{}',
  "createdAt" TEXT NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT
);

-- 2. sl_todos テーブル
CREATE TABLE IF NOT EXISTS public.sl_todos (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  details TEXT,
  minutes INTEGER,
  category TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TEXT NOT NULL,
  "scheduleType" TEXT DEFAULT 'none',
  "dueDate" TEXT,
  "scheduleDays" INTEGER[],
  "completedAt" TEXT,
  "relatedLogId" TEXT,
  priority TEXT DEFAULT 'medium',
  "order" INTEGER DEFAULT 0,
  "dueTime" TEXT,
  "reminderMinutesBefore" INTEGER,
  "startTime" TEXT,
  "endTime" TEXT,
  "syncToReport" BOOLEAN DEFAULT false,
  "videoId" TEXT
);

-- 3. sl_settings テーブル
CREATE TABLE IF NOT EXISTS public.sl_settings (
  id TEXT PRIMARY KEY DEFAULT 'current',
  "dailyGoal" INTEGER NOT NULL DEFAULT 120,
  "weeklyGoal" INTEGER NOT NULL DEFAULT 840,
  categories TEXT[] DEFAULT ARRAY['React', 'Next.js', 'TypeScript', 'TailwindCSS', '英語', '読書', 'その他'],
  "categoryColors" JSONB DEFAULT '{}'
);

-- 4. RLS ポリシー（全アクセス許可）
ALTER TABLE public.sl_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sl_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sl_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on sl_logs" ON public.sl_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sl_todos" ON public.sl_todos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on sl_settings" ON public.sl_settings FOR ALL USING (true) WITH CHECK (true);
