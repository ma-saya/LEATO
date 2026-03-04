import { createClient } from '@/lib/supabase/client';
import { Log, Todo, Settings } from '@/types/stacklog';

const getSupabase = () => createClient();

// 現在のユーザーIDを取得（未ログイン時はnull）
const getUserId = async (): Promise<string | null> => {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

// Logs
export const getLogs = async (): Promise<Log[]> => {
  const supabase = getSupabase();
  // RLS が user_id でフィルタするため明示的フィルタ不要
  const { data, error } = await supabase
    .from('sl_logs')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) {
    console.error('Error fetching logs:', error);
    return [];
  }
  return data || [];
};

export const saveLog = async (log: Log) => {
  const supabase = getSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('sl_logs')
    .insert({ ...log, user_id: userId })
    .select();
  
  if (error) throw error;
  return data;
};

export const deleteLog = async (id: string) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('sl_logs')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const updateLog = async (log: Log) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sl_logs')
    .update(log)
    .eq('id', log.id)
    .select();
  
  if (error) throw error;
  return data;
};

// Todos
export const getTodos = async (): Promise<Todo[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sl_todos')
    .select('*')
    .order('order', { ascending: true });
  
  if (error) {
    console.error('Error fetching todos:', error);
    return [];
  }
  return data || [];
};

export const saveTodo = async (todo: Todo) => {
  const supabase = getSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('sl_todos')
    .insert({ ...todo, user_id: userId })
    .select();
  
  if (error) throw error;
  return data;
};

export const updateTodo = async (todo: Todo) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sl_todos')
    .update(todo)
    .eq('id', todo.id)
    .select();
  
  if (error) throw error;
  return data;
};

export const deleteTodo = async (id: string) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('sl_todos')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteTodos = async (ids: string[]) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('sl_todos')
    .delete()
    .in('id', ids);
  
  if (error) throw error;
};

export const reorderTodos = async (todos: Todo[]) => {
  const supabase = getSupabase();
  const updates = todos.map((todo, index) => ({
    id: todo.id,
    order: index,
  }));
  
  for (const update of updates) {
    const { error } = await supabase
      .from('sl_todos')
      .update({ order: update.order })
      .eq('id', update.id);
    if (error) throw error;
  }
};

// Settings
export const getSettings = async (): Promise<Settings> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('sl_settings')
    .select('*')
    .maybeSingle();
  
  if (error || !data) {
    return {
      dailyGoal: 120,
      weeklyGoal: 840,
      categories: ['React', 'Next.js', 'TypeScript', 'TailwindCSS', '英語', '読書', 'その他'],
      categoryColors: {},
    };
  }
  return data;
};

export const saveSettings = async (settings: Settings) => {
  const supabase = getSupabase();
  const userId = await getUserId();
  const settingsId = userId || 'current';
  const { error } = await supabase
    .from('sl_settings')
    .upsert({ id: settingsId, user_id: userId, ...settings });
  
  if (error) throw error;
};
