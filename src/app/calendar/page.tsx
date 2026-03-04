'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { getLogs, deleteLog, getSettings } from '@/lib/stacklog-store';
import type { Log, Settings } from '@/types/stacklog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [settings, setSettings] = useState<Settings>({
    dailyGoal: 120,
    weeklyGoal: 840,
    categories: ['React', 'Next.js', 'TypeScript', 'TailwindCSS', '英語', '読書', 'その他'],
    categoryColors: {}
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const loadLogs = async () => {
    setLogs(await getLogs());
    setSettings(await getSettings());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleDeleteLog = async (id: string) => {
    if (!confirm('このログを削除しますか？')) return;
    await deleteLog(id);
    await loadLogs();
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { locale: ja });
  const endDate = endOfWeek(monthEnd, { locale: ja });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const logsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return logs.filter((log) => isSameDay(parseISO(log.date), selectedDate));
  }, [logs, selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
        <h1 className="text-2xl font-bold">学習カレンダー</h1>
        <div className="w-20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle>{format(currentMonth, 'yyyy年 M月', { locale: ja })}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
                  <div key={d} className="text-xs font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dayLogs = logs.filter((log) => isSameDay(parseISO(log.date), day));
                  const hasLog = dayLogs.length > 0;
                  const totalMinutes = dayLogs.reduce((acc, log) => acc + log.minutes, 0);
                  const dailyGoal = settings.dailyGoal || 120;
                  const achievementRate = Math.min(totalMinutes / dailyGoal, 1);
                  const isGoalMet = totalMinutes >= dailyGoal;

                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const inCurrentMonth = isSameMonth(day, monthStart);

                  // Circular Progress Params
                  const radius = 18;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference * (1 - achievementRate);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'min-h-[44px] sm:min-h-[50px] md:min-h-[60px] flex flex-col items-center justify-center rounded-md text-sm transition-colors relative group py-2 w-full',
                        !inCurrentMonth && 'text-muted-foreground/30 bg-muted/20',
                        inCurrentMonth && 'text-foreground hover:bg-accent',
                        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background z-10',
                        // hasLog && inCurrentMonth && 'bg-emerald-50 dark:bg-emerald-900/30' // Removed simple background to emphasize ring
                      )}
                    >
                      {/* Progress Ring */}
                      {inCurrentMonth && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg className="h-10 w-10 -rotate-90 transform" viewBox="0 0 44 44">
                                <circle
                                    className="text-muted/20"
                                    strokeWidth="3"
                                    stroke="currentColor"
                                    fill="transparent"
                                    r={radius}
                                    cx="22"
                                    cy="22"
                                />
                                {achievementRate > 0 && (
                                    <circle
                                        className={cn(
                                            "transition-all duration-500 ease-in-out",
                                            isGoalMet ? "text-yellow-500 drop-shadow-[0_0_2px_rgba(234,179,8,0.5)]" : "text-emerald-500"
                                        )}
                                        strokeWidth="3"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        r={radius}
                                        cx="22"
                                        cy="22"
                                    />
                                )}
                            </svg>
                        </div>
                      )}

                      <span className={cn(
                          "relative z-10 font-medium",
                          isGoalMet && inCurrentMonth ? "text-yellow-600 dark:text-yellow-400 font-bold" : ""
                      )}>{format(day, 'd')}</span>
                      
                      {/* Dots for logs */}
                       {/* Removed single dot, replace with small indicators if needed? maybe just the ring is enough. */}
                       {/* Let's keep a tiny dot for "some activity" if goal is 0? No, ring handles partial. */}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>
                {selectedDate ? format(selectedDate, 'yyyy年M月d日', { locale: ja }) : '日付を選択'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsForSelectedDate.length > 0 ? (
                <div className="space-y-4">
                  {logsForSelectedDate.map((log) => (
                    <div key={log.id} className="border-l-2 border-emerald-500 pl-4 py-1 group relative">
                      <div className="font-semibold text-sm pr-6 text-foreground">{log.did}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {log.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{log.minutes} 分</span>
                      </div>
                      {log.learned && <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{log.learned}</p>}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-6 w-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteLog(log.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm">
                  <p>ログはありません</p>
                  {selectedDate && isSameDay(selectedDate, new Date()) && (
                    <Link href="/log/new" className="mt-4">
                      <Button size="sm" variant="outline">
                        今日のログを追加
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
