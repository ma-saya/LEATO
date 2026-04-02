'use client';

import Link from 'next/link';
import { X, BookOpen, Flame, CalendarCheck, Clock as ClockIcon, BarChart3, CheckSquare, ArrowRight, PenLine, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Log, Todo, Settings } from '@/types/stacklog';

type StackLogDrawerProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  streak: number;
  todayMinutes: number;
  dailyGoal: number;
  totalMinutes: number;
  sortedLogs: Log[];
  incompleteTodos: Todo[];
  handleOpenCompleteModal: (todo: Todo) => void;
  setIsModalOpen: (open: boolean) => void;
  setModalMode: (mode: 'complete' | 'edit' | 'create') => void;
  setSelectedTodo: (todo: Todo | null) => void;
};

export function StackLogDrawer({
  isOpen,
  setIsOpen,
  streak,
  todayMinutes,
  dailyGoal,
  totalMinutes,
  sortedLogs,
  incompleteTodos,
  handleOpenCompleteModal,
  setIsModalOpen,
  setModalMode,
  setSelectedTodo,
}: StackLogDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      {/* Drawer Panel */}
      <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50 overflow-y-auto animate-in slide-in-from-right duration-300 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-indigo-600/20 rounded-lg">
              <BookOpen className="h-4 w-4 text-indigo-400" />
            </div>
            <h2 className="font-bold text-lg tracking-tight">StackLog</h2>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">連続学習</span>
                <Flame className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-2xl font-black">{streak} <span className="text-xs font-normal text-muted-foreground">DAYS</span></div>
            </div>
            <div className={cn(
              "bg-card border border-border rounded-2xl p-4 shadow-sm transition-all",
              todayMinutes > 0 && "border-indigo-500/30 bg-indigo-500/5 shadow-indigo-500/5"
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">今日</span>
                <CalendarCheck className={cn("h-4 w-4", todayMinutes > 0 ? "text-indigo-400" : "text-muted-foreground")} />
              </div>
              <div className="text-2xl font-black">{dailyGoal > 0 ? `${Math.round((todayMinutes / dailyGoal) * 100)}%` : '—'}</div>
              <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${Math.min((todayMinutes / dailyGoal) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">今日の学習</span>
                <ClockIcon className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black">{todayMinutes} <span className="text-xs font-normal text-muted-foreground">MINS</span></div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">累計学習</span>
                <BarChart3 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black">{totalMinutes} <span className="text-xs font-normal text-muted-foreground">MINS</span></div>
            </div>
          </div>

          {/* Task List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <CheckSquare className="h-3.5 w-3.5 text-indigo-400" /> 未完了タスク
                <span className="bg-indigo-500/10 text-indigo-400 rounded-full px-2 py-0.5 text-[10px] font-black">{incompleteTodos.length}</span>
              </h3>
              <Link href="/tasks" onClick={() => setIsOpen(false)} className="text-[10px] uppercase font-black text-indigo-400 hover:text-indigo-300 transition-colors">
                全表示 →
              </Link>
            </div>
            <div className="space-y-2">
              {incompleteTodos.slice(0, 5).map(todo => (
                <div key={todo.id} className="p-3 bg-muted/30 border border-border/50 rounded-xl flex items-center justify-between group hover:bg-muted/60 transition-all">
                  <div className="flex items-center gap-3 min-w-0">
                    <button 
                      onClick={() => handleOpenCompleteModal(todo)}
                      className="h-5 w-5 rounded-lg border-2 border-border hover:border-indigo-500 flex-shrink-0 flex items-center justify-center bg-card transition-all group-hover:scale-110 shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{todo.text}</p>
                      {todo.category && (
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">{todo.category}</span>
                      )}
                    </div>
                  </div>
                  {todo.minutes && <span className="text-[10px] font-black text-indigo-400/80 bg-indigo-500/5 px-2 py-1 rounded-lg ml-2">{todo.minutes}M</span>}
                </div>
              ))}
              {incompleteTodos.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-xs border border-dashed border-border/50 rounded-2xl bg-muted/10">
                  <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p>全てのタスクが完了しました！</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Logs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
              <ClockIcon className="h-3.5 w-3.5 text-amber-400" /> 最近の学習ログ
            </h3>
            <div className="space-y-2">
              {sortedLogs.slice(0, 5).map(log => (
                <div key={log.id} className="p-3 bg-card border border-border rounded-xl flex items-center justify-between shadow-sm">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{log.did}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded">{log.category}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(log.date), 'M/d')}</span>
                    </div>
                  </div>
                  <span className="text-sm font-black text-foreground ml-2">{log.minutes} <span className="text-[10px] font-normal text-muted-foreground">MIN</span></span>
                </div>
              ))}
              {sortedLogs.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-xs border border-dashed border-border/50 rounded-2xl">
                  <p>学習ログがまだありません</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <Link
              href="/log/new"
              onClick={() => setIsOpen(false)}
              className="p-4 rounded-2xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 flex flex-col items-center justify-center gap-2"
            >
              <PenLine className="h-5 w-5" /> ログ記録
            </Link>
            <button
              onClick={() => {
                setModalMode('create');
                setSelectedTodo(null);
                setIsModalOpen(true);
              }}
              className="p-4 rounded-2xl bg-card border-2 border-border text-foreground text-xs font-black uppercase tracking-widest hover:bg-muted transition-all flex flex-col items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" /> タスク追加
            </button>
            <Link
              href="/stats"
              onClick={() => setIsOpen(false)}
              className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/80 text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-all flex items-center justify-center gap-2"
            >
              <BarChart3 className="h-3.5 w-3.5" /> 統計詳細
            </Link>
            <Link
              href="/calendar"
              onClick={() => setIsOpen(false)}
              className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/80 text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-all flex items-center justify-center gap-2"
            >
              <CalendarCheck className="h-3.5 w-3.5" /> カレンダー
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
