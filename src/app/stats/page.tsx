'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CalendarCheck,
  Clock,
  Flame,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
// ... (recharts imports)

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  getHours,
  isSameDay,
  isSameMonth,
  parseISO,
  subDays,
  subMonths,
  subWeeks,
  subYears,
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import { getLogs, deleteLog, updateLog, getSettings } from '@/lib/stacklog-store';
import { calculateStreak, calculateMaxStreak, calculateGoalAchievementDays, calculateGoalStreak, calculateMaxGoalStreak } from '@/lib/stacklog-logic';
import type { Log, Settings } from '@/types/stacklog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TimePicker } from '@/components/ui/time-picker';
import { CategoryPills } from '@/components/CategoryPills';
import { DayComparisonView } from '@/components/DayComparisonView';

type Period = '1day' | '1week' | '1month' | '3months' | '1year';
type ValueType = number | string | Array<number | string> | undefined;

interface ChartDataItem {
  name: string;
  minutes: number;
  fullDate?: string;
  hour?: number;
  [category: string]: number | string | undefined;
}

export default function StatsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Settings>({ dailyGoal: 120, weeklyGoal: 840, categories: [], categoryColors: {} });
  const [period, setPeriod] = useState<Period>('1day');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<Log | null>(null);

  useEffect(() => {
    const handleStorageUpdate = async () => {
      const newLogs = await getLogs();
      const newSettings = await getSettings();
      setLogs(newLogs);
      setSettings(newSettings);
      setCategoryColors(newSettings.categoryColors || {});
    };
    window.addEventListener('storage-update', handleStorageUpdate);
    return () => window.removeEventListener('storage-update', handleStorageUpdate);
  }, []);

  const loadLogs = async () => {
    const [fetchedLogs, fetchedSettings] = await Promise.all([getLogs(), getSettings()]);
    setLogs(fetchedLogs);
    setSettings(fetchedSettings);
    setCategoryColors(fetchedSettings.categoryColors || {});
  };

  useEffect(() => { loadLogs(); }, []);

  const handleDeleteLog = async (id: string) => {
    if (!confirm('このログを削除しますか？')) return;
    await deleteLog(id);
    await loadLogs();
  };;

  const totalMinutes = logs.reduce((acc, log) => acc + log.minutes, 0);
  const daysLogged = new Set(logs.map((l) => l.date)).size;

  const categoryStats: Record<string, number> = {};
  logs.forEach((log) => {
    categoryStats[log.category] = (categoryStats[log.category] || 0) + log.minutes;
  });
  const categories = Object.entries(categoryStats).sort(([, a], [, b]) => b - a);

  const selectedCategoryLogs = useMemo(() => {
    if (!selectedCategory) return [];
    return logs
      .filter((l) => l.category === selectedCategory)
      .sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime() ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [logs, selectedCategory]);

  const [selectedChartItem, setSelectedChartItem] = useState<ChartDataItem | null>(null);
  const [showTimeDetails, setShowTimeDetails] = useState(false);
  const [showAllTimeDetails, setShowAllTimeDetails] = useState(false);
  const [showDaysDetails, setShowDaysDetails] = useState(false);
  const [showStreakDetails, setShowStreakDetails] = useState(false);

  const maxDailyMinutes = useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    logs.forEach(l => {
        const date = l.date;
        dailyTotals[date] = (dailyTotals[date] || 0) + l.minutes;
    });
    const max = Math.max(...Object.values(dailyTotals), 0);
    return max;
  }, [logs]);

  const maxStreak = useMemo(() => calculateMaxStreak(logs), [logs]);

  const chartData = useMemo<ChartDataItem[]>(() => {
    const today = new Date();

    if (period === '1day') {
      const targetDate = currentDate;
      const data = new Array(24).fill(0).map((_, i) => ({
        name: `${i}時`,
        minutes: 0,
        hour: i,
        fullDate: format(targetDate, 'yyyy-MM-dd'),
      }));

      const targetLogs = logs.filter((log) => isSameDay(parseISO(log.date), targetDate));
      
      targetLogs.forEach((log) => {
        let startH: number, startM: number, endH: number, endM: number;

        // 1. Determine Start/End Times
        if (log.startTime && log.endTime) {
             [startH, startM] = log.startTime.split(':').map(Number);
             [endH, endM] = log.endTime.split(':').map(Number);
        } else {
            // Fallback: Start at createdAt, End after 'minutes'
            const createdAt = parseISO(log.createdAt);
            startH = getHours(createdAt);
            startM = createdAt.getMinutes();
            
            const endDate = new Date(createdAt);
            endDate.setMinutes(endDate.getMinutes() + log.minutes);
            endH = getHours(endDate);
            endM = endDate.getMinutes();
            
            // Handle day overflow (keep it simple for 1day view, cap at 23:59)
            if (endDate.getDate() !== createdAt.getDate()) {
                endH = 23; 
                endM = 59;
            }
        }

        // 2. Distribute Minutes
        if (startH === endH) {
            const duration = (endH * 60 + endM) - (startH * 60 + startM);
             if (data[startH]) data[startH].minutes += duration;
        } else {
            // First hour
            if (data[startH]) data[startH].minutes += (60 - startM);
            
            // Middle hours
            for (let h = startH + 1; h < endH; h++) {
                if (data[h]) data[h].minutes += 60;
            }
            
            // Last hour
            if (data[endH]) data[endH].minutes += endM;
        }
      });
      return data;
    }

   if (period === '1week') {
      const start = subDays(today, 6);
      const days = eachDayOfInterval({ start, end: today });
      return days.map((day) => {
        const dailyLogs = logs.filter((log) => isSameDay(parseISO(log.date), day));
        const total = dailyLogs.reduce((acc, l) => acc + l.minutes, 0);
        
        const categoryBreakdown: Record<string, number> = {};
        dailyLogs.forEach(log => {
             categoryBreakdown[log.category] = (categoryBreakdown[log.category] || 0) + log.minutes;
        });

        return {
          name: format(day, 'M/d(E)', { locale: ja }),
          minutes: total,
          fullDate: format(day, 'yyyy-MM-dd'),
          ...categoryBreakdown
        };
      });
    }

    if (period === '1month' || period === '3months') {
      const start = subDays(today, period === '1month' ? 29 : 89);
      const days = eachDayOfInterval({ start, end: today });
      return days.map((day) => {
        const dailyLogs = logs.filter((log) => isSameDay(parseISO(log.date), day));
        const total = dailyLogs.reduce((acc, l) => acc + l.minutes, 0);

        const categoryBreakdown: Record<string, number> = {};
        dailyLogs.forEach(log => {
             categoryBreakdown[log.category] = (categoryBreakdown[log.category] || 0) + log.minutes;
        });

        return {
          name: format(day, 'M/d'),
          minutes: total,
          fullDate: format(day, 'yyyy-MM-dd'),
          ...categoryBreakdown
        };
      });
    }

    // 1year logic
    const start = subMonths(today, 11);
    const months = eachMonthOfInterval({ start, end: today });
    return months.map((month) => {
      const monthlyLogs = logs.filter((log) => isSameMonth(parseISO(log.date), month));
      const total = monthlyLogs.reduce((acc, l) => acc + l.minutes, 0);
      
      const categoryBreakdown: Record<string, number> = {};
      monthlyLogs.forEach(log => {
             categoryBreakdown[log.category] = (categoryBreakdown[log.category] || 0) + log.minutes;
      });

      return {
        name: format(month, 'yyyy年M月', { locale: ja }),
        minutes: total,
        ...categoryBreakdown
      };
    });

  }, [logs, period, currentDate]);

  const yAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [0, 30, 60, 90, 120];
    const maxVal = Math.max(...chartData.map((d) => d.minutes));
    const domainMax = Math.ceil(Math.max(maxVal, 60) / 30) * 30;

    const ticks: number[] = [];
    for (let i = 0; i <= domainMax; i += 30) ticks.push(i);
    return ticks;
  }, [chartData]);

  const periodTotalMinutes = useMemo(
    () => chartData.reduce((acc, data) => acc + data.minutes, 0),
    [chartData]
  );
  
  const periodActiveDays = useMemo(() => {
     const today = new Date();
     let rangeStart = today;
     let rangeEnd = today;
 
     if (period === '1day') {
         rangeStart = currentDate;
         rangeEnd = currentDate;
     } else if (period === '1week') {
         rangeStart = subDays(today, 6);
     } else if (period === '1month') {
         rangeStart = subDays(today, 29);
     } else if (period === '3months') {
         rangeStart = subDays(today, 89);
     } else if (period === '1year') {
         rangeStart = subMonths(today, 11);
         // For year, we need to make sure we cover the full start month
     }
 
     // Filter logs within range
     const activeDates = new Set<string>();
     logs.forEach(log => {
         const logDate = parseISO(log.date);
         
         let include = false;
         if (period === '1day') {
             include = isSameDay(logDate, rangeStart);
         } else if (period === '1year') {
             include = logDate >= rangeStart && logDate <= rangeEnd;
         } else {
             include = logDate >= rangeStart && logDate <= rangeEnd;
         }
 
         if (include) {
             activeDates.add(log.date);
         }
     });
     
     return activeDates.size;
  }, [logs, period, currentDate]);

  const filteredLogsForChart = useMemo(() => {
    if (!selectedChartItem) return [];
    
    // For 1day: Filter by hour overlap
    if (period === '1day' && selectedChartItem.hour !== undefined) {
         return logs.filter(log => {
             const isTargetDate = isSameDay(parseISO(log.date), currentDate);
             if (!isTargetDate) return false;

             let startH, endH;
             if (log.startTime && log.endTime) {
                 [startH] = log.startTime.split(':').map(Number);
                 [endH] = log.endTime.split(':').map(Number);
             } else {
                 const createdAt = parseISO(log.createdAt);
                 startH = getHours(createdAt);
                 const endDate = new Date(createdAt);
                 endDate.setMinutes(endDate.getMinutes() + log.minutes);
                 endH = getHours(endDate);
             }

             return selectedChartItem.hour! >= startH && selectedChartItem.hour! <= endH;
         });
    }

    // For others: Filter by date
    if (selectedChartItem.fullDate) {
        return logs.filter(log => log.date === selectedChartItem.fullDate);
    }
    
    return [];
  }, [logs, selectedChartItem, period, currentDate]);


  return (
    <div className="space-y-6 pb-20 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
        <h1 className="text-2xl font-bold">学習レポート</h1>
        <div className="w-20" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors group relative overflow-hidden"
            onClick={() => setShowAllTimeDetails(!showAllTimeDetails)}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col h-full justify-between gap-1">
                <div>
                    {!showAllTimeDetails ? (
                        <div className="text-2xl font-bold ">{(totalMinutes / 60).toFixed(1)}時間</div>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-200">
                             <div className="text-lg font-bold">{totalMinutes}分</div>
                             <div className="text-xs text-muted-foreground mt-1">
                                {Math.floor(totalMinutes / 60)}時間{totalMinutes % 60}分
                                <span className="ml-2 opacity-70">({(totalMinutes / 60 / 24).toFixed(1)}日)</span>
                             </div>
                             <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/50">
                                {(() => {
                                  const avg = Math.round(totalMinutes / Math.max(daysLogged, 1));
                                  return (
                                    <>
                                      平均: {avg >= 60 ? `${Math.floor(avg / 60)}時間${avg % 60}分` : `${avg}分`}/日 ({daysLogged}日)
                                    </>
                                  );
                                })()}
                             </div>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">総学習時間 (全期間)</p>
                    <Clock className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
            </div>
          </CardContent>
        </Card>
        <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors group relative overflow-hidden"
            onClick={() => setShowTimeDetails(!showTimeDetails)}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col h-full justify-between gap-1">
                <div>
                    {!showTimeDetails ? (
                        <div className="text-2xl font-bold ">{(periodTotalMinutes / 60).toFixed(1)}時間</div>
                    ) : (
                        <div className="animate-in fade-in zoom-in duration-200">
                             <div className="text-lg font-bold">{periodTotalMinutes}分</div>
                             <div className="text-xs text-muted-foreground mt-1">
                                {Math.floor(periodTotalMinutes / 60)}時間{periodTotalMinutes % 60}分
                                <span className="ml-2 opacity-70">({(periodTotalMinutes / 60 / 24).toFixed(1)}日)</span>
                             </div>
                             <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/50">
                                {(() => {
                                  const avg = Math.round(periodTotalMinutes / Math.max(periodActiveDays, 1));
                                  return (
                                    <>
                                      平均: {avg >= 60 ? `${Math.floor(avg / 60)}時間${avg % 60}分` : `${avg}分`}/日 ({periodActiveDays}日)
                                    </>
                                  );
                                })()}
                             </div>
                             {(() => {
                                const goalDays = calculateGoalAchievementDays(
                                    chartData.map(d => ({ date: d.fullDate!, minutes: d.minutes } as Log)), 
                                    settings.dailyGoal
                                );
                                if (settings.dailyGoal > 0 && period !== '1day') {
                                    return (
                                        <div className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/50 flex items-center gap-1">
                                            <CalendarCheck className="h-3 w-3" />
                                            目標達成: {goalDays}日
                                        </div>
                                    )
                                }
                                return null;
                             })()}
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">期間合計 ({showTimeDetails ? '詳細' : 'h'})</p>
                    <Clock className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
            </div>
          </CardContent>
        </Card>
        <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors group relative overflow-hidden"
            onClick={() => setShowDaysDetails(!showDaysDetails)}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col h-full justify-between gap-1">
                <div>
                     {!showDaysDetails ? (
                         <div className="text-2xl font-bold">{daysLogged}日</div>
                     ) : (
                        <div className="animate-in fade-in zoom-in duration-200">
                             <div className="text-lg font-bold">{daysLogged}日</div>
                             <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/50">
                                MAX: 
                                {maxDailyMinutes >= 60 
                                    ? `${Math.floor(maxDailyMinutes / 60)}時間${maxDailyMinutes % 60}分` 
                                    : `${maxDailyMinutes}分`}/日
                             </div>
                        </div>
                     )}
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground mr-1">学習日数 ({showDaysDetails ? '詳細' : '合計'})</p>
                    <Calendar className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
            </div>
          </CardContent>
        </Card>
        <Card
             className="cursor-pointer hover:bg-accent/50 transition-colors group relative overflow-hidden"
             onClick={() => setShowStreakDetails(!showStreakDetails)}
        >
          <CardContent className="pt-6">
            <div className="flex flex-col h-full justify-between gap-1">
                <div>
                     {!showStreakDetails ? (
                        <div className="text-2xl font-bold flex items-center gap-1">
                          <Flame className="h-5 w-5 text-orange-500" />
                          {calculateStreak(logs)}日
                        </div>
                     ) : (
                        <div className="animate-in fade-in zoom-in duration-200">
                             <div className="text-lg font-bold flex items-center gap-1">
                                <Flame className="h-4 w-4 text-orange-500" />
                                {calculateStreak(logs)}日
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border/50">
                                MAX: {maxStreak}日 (連続)
                              </div>
                              {(() => {
                                 if (settings.dailyGoal > 0) {
                                     const goalStreak = calculateGoalStreak(logs, settings.dailyGoal);
                                     const maxGoalStreak = calculateMaxGoalStreak(logs, settings.dailyGoal);
                                     const totalGoalDays = calculateGoalAchievementDays(logs, settings.dailyGoal);
                                     
                                     return (
                                        <div className="mt-2 text-xs text-muted-foreground pt-1 border-t border-border/50">
                                            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-medium">
                                                <CalendarCheck className="h-3 w-3" />
                                                目標達成: {totalGoalDays}日
                                            </div>
                                            <div className="flex justify-between mt-0.5 pl-4">
                                                <span>連続: {goalStreak}日</span>
                                                <span>MAX: {maxGoalStreak}日</span>
                                            </div>
                                        </div>
                                     );
                                 }
                                 return null;
                              })()}
                        </div>
                     )}
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">現在のストリーク</p>
                    <TrendingUp className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-50 transition-opacity" />
                </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle>学習時間の推移</CardTitle>
              <div className="flex items-center gap-2 text-sm ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (period === '1day') setCurrentDate(subDays(currentDate, 1));
                    if (period === '1week') setCurrentDate(subWeeks(currentDate, 1));
                    if (period === '1month') setCurrentDate(subMonths(currentDate, 1));
                    if (period === '3months') setCurrentDate(subMonths(currentDate, 3));
                    if (period === '1year') setCurrentDate(subYears(currentDate, 1));
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <span className="font-medium whitespace-nowrap">
                  {period === '1day' && format(currentDate, 'M/d (E)', { locale: ja })}
                  {period === '1week' && `W${format(currentDate, 'w', { locale: ja })}`}
                  {period === '1month' && format(currentDate, 'yyyy/M', { locale: ja })}
                  {period === '3months' && format(currentDate, 'yyyy/M', { locale: ja })}
                  {period === '1year' && format(currentDate, 'yyyy', { locale: ja })}
                </span>
                
                <div className="relative">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-gray-900">
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <input
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        setCurrentDate(new Date(e.target.value));
                      }
                    }}
                    value={format(currentDate, 'yyyy-MM-dd')}
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    if (period === '1day') setCurrentDate(addDays(currentDate, 1));
                    if (period === '1week') setCurrentDate(addWeeks(currentDate, 1));
                    if (period === '1month') setCurrentDate(addMonths(currentDate, 1));
                    if (period === '3months') setCurrentDate(addMonths(currentDate, 3));
                    if (period === '1year') setCurrentDate(addYears(currentDate, 1));
                  }}
                  disabled={
                    (period === '1day' && isSameDay(currentDate, new Date())) ||
                    (period === '1month' && isSameMonth(currentDate, new Date())) ||
                    (period === '1year' && currentDate.getFullYear() === new Date().getFullYear())
                    // Simplified disabled logic for other periods or refine if needed
                  }
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {(['1day', '1week', '1month', '3months', '1year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md transition-all',
                    period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {p === '1day' && '1日'}
                  {p === '1week' && '1週間'}
                  {p === '1month' && '1ヶ月'}
                  {p === '3months' && '3ヶ月'}
                  {p === '1year' && '1年'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[600px] w-full pt-4">
          {period === '1day' ? (
                <div className="h-full w-full overflow-hidden">
                    <DayComparisonView 
                        currentDate={currentDate} 
                        logs={logs.filter((log) => isSameDay(parseISO(log.date), currentDate))}
                        categoryColors={categoryColors}
                        onLogUpdate={() => loadLogs()}
                    />
                </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
                 {/* Stacked Bar Chart for all periods > 1 day */}
                <BarChart data={chartData} onClick={(data: any) => {
                  if (data && data.activePayload && data.activePayload.length > 0) {
                    setSelectedChartItem(data.activePayload[0].payload);
                  }
                }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: '#6B7280' }} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={period === '3months' ? 6 : 'preserveEnd'}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    axisLine={false}
                    tickLine={false}
                    unit="分"
                    width={45}
                    domain={[0, 'auto']}
                    ticks={yAxisTicks}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#F3F4F6' }}
                    formatter={(value: ValueType, name: string | number | undefined) => {
                         if (name === '学習時間') return [`${value}分`, name]; // Total
                         return [`${value}分`, name]; 
                    }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        return (payload[0].payload as ChartDataItem).fullDate || label;
                      }
                      return label;
                    }}
                  />
                  {/* Generate Bars for each category present in categories list */}
                  {/* Using 'categories' list which assumes it contains all potential categories. 
                      However 'categories' is sorted by total minutes. 
                      We want consistent coloring. */}
                  {categories.map(([catName]) => (
                      <Bar 
                        key={catName} 
                        dataKey={catName} 
                        stackId="a" 
                        fill={categoryColors[catName] || '#000'} 
                        radius={[0, 0, 0, 0]} 
                        barSize={32}
                         // Only top bar gets radius? Recharts handles this if stackId is same? 
                         // Actually, we might want to manually set radius for just the top one if possible, 
                         // but standard stacked bar usually has top radius on the top-most segment only.
                         // Recharts 2.x handles radius on stacked bars a bit weirdly. 
                         // Let's keep it simple for now, maybe flat or small radius.
                      />
                  ))}
                </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle>カテゴリ別学習時間</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={categories.map(([name, value]) => ({ name, value }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {categories.map(([name], index) => (
                                  <Cell key={`cell-${index}`} fill={categoryColors[name] || '#CBD5E1'} />
                              ))}
                          </Pie>
                          <Tooltip formatter={(value: number | undefined) => [value ? `${value}分` : '0分', '学習時間']} />
                          <Legend />
                      </PieChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>学習時間の内訳</CardTitle>
              <p className="text-xs text-gray-500">カテゴリをクリックすると詳細を確認できます。</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categories.map(([cat, minutes]) => {
                  const percentage = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
                  const catStreak = calculateStreak(logs.filter((l) => l.category === cat));

                  return (
                    <div
                      key={cat}
                      className="space-y-1 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors -mx-2"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <div className="flex justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cat}</span>
                          {catStreak > 0 && (
                            <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium flex items-center gap-1">
                              <Flame className="h-3 w-3" /> {catStreak}日連続
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500">
                          {minutes} 分 ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Category Filter for Log List */}
      <div className="mb-4">
        <CategoryPills
          categories={['ALL', ...Array.from(new Set(logs.map(l => l.category)))]}
          selected={selectedCategory || 'ALL'}
          onSelect={(cat) => setSelectedCategory(cat === 'ALL' ? null : cat)}
          colors={categoryColors}
        />
      </div>

      {/* Unscheduled Logs Section (Only for 1day view) */}
      {period === '1day' && (
        (() => {
            const targetLogs = logs.filter((log) => isSameDay(parseISO(log.date), currentDate));
            const unscheduledLogs = targetLogs.filter(l => !l.startTime || !l.endTime);

            if (unscheduledLogs.length === 0) return null;

            return (
                <Card className="border-dashed">
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
                             <Clock className="h-4 w-4" />
                             時間指定なしの記録
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {unscheduledLogs.map(log => (
                                <div 
                                    key={log.id} 
                                    className="bg-gray-100 px-3 py-2 rounded-md text-sm flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors"
                                    onClick={() => setEditingLog({
                                        ...log,
                                        startTime: log.startTime || '09:00',
                                        endTime: log.endTime || '10:00'
                                    })}
                                >
                                     <span className="font-medium">{log.did}</span>
                                     <span className="text-xs bg-white px-1.5 rounded border text-gray-500">{log.minutes}min</span>
                                     <span className="text-[10px] text-blue-500 font-medium">時間設定</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>

                </Card>
            );
        })()
      )}

      {/* Edit Log Time Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-sm shadow-xl animate-in fade-in zoom-in duration-200">
                <CardHeader>
                    <CardTitle className="text-lg">時間を設定</CardTitle>
                    <p className="text-sm text-gray-500">{editingLog.did}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-500">日付</label>
                        <input 
                            type="date"
                            className="w-full border rounded px-2 py-1"
                            value={editingLog.date}
                            max={format(new Date(), 'yyyy-MM-dd')}
                            onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="space-y-1 flex-1">
                             <label className="text-xs font-medium text-gray-500">開始</label>
                             <TimePicker 
                                value={editingLog.startTime || ''}
                                onChange={(val) => {
                                    const newStart = val;
                                    const updated = { ...editingLog, startTime: newStart };
                                    
                                    // Auto-calc end time based on minutes
                                    if (newStart && updated.minutes) {
                                        const date = new Date(`2000/01/01 ${newStart}`);
                                        date.setMinutes(date.getMinutes() + updated.minutes);
                                        updated.endTime = format(date, 'HH:mm');
                                    }
                                    setEditingLog(updated);
                                }}
                             />
                         </div>
                         <div className="pt-5 text-gray-400">→</div>
                         <div className="space-y-1 flex-1">
                             <label className="text-xs font-medium text-gray-500">終了</label>
                             <TimePicker 
                                value={editingLog.endTime || ''}
                                onChange={(val) => setEditingLog({ ...editingLog, endTime: val })}
                             />
                         </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setEditingLog(null)}>キャンセル</Button>
                        <Button onClick={() => {
                            if (editingLog.startTime && editingLog.endTime && editingLog.date) {
                                updateLog(editingLog);
                                loadLogs(); // Refresh
                                setEditingLog(null);
                            } else {
                                alert('日付、開始時間、終了時間をすべて入力してください');
                            }
                        }}>保存</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}

      {/* Selected Period Details */}
      {selectedChartItem && (
        <Card className="animate-in fade-in slide-in-from-top-2 duration-300 border-l-4 border-l-black">
            <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                    <span>
                        {selectedChartItem.name} の詳細 ({selectedChartItem.minutes}分)
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedChartItem(null)} className="h-6 w-6 p-0">
                        <X className="h-4 w-4" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {filteredLogsForChart.length > 0 ? (
                    <div className="space-y-3">
                        {filteredLogsForChart.map((log) => (
                            <div key={log.id} className="flex gap-3 items-start pb-3 border-b last:border-0 last:pb-0">
                                <div className="mt-1 bg-gray-100 p-2 rounded text-gray-500">
                                    <Clock className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <p className="font-medium text-sm">{log.did}</p>
                                        <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                            {log.minutes}min
                                        </span>
                                    </div>
                                    <div className="flex gap-2 items-center mt-1">
                                        <Badge 
                                          variant="outline" 
                                          className="text-[10px] h-5 px-1.5 border"
                                          style={{
                                            borderColor: categoryColors[log.category] || '#e5e7eb',
                                            color: categoryColors[log.category] || '#374151',
                                            backgroundColor: 'white'
                                          }}
                                        >
                                          {log.category}
                                        </Badge>
                                        {(log.startTime || log.endTime) && (
                                            <span className="text-xs text-gray-400">
                                                {log.startTime || '??:??'} - {log.endTime || '??:??'}
                                            </span>
                                        )}
                                    </div>
                                    {log.learned && (
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{log.learned}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 py-4 text-center">この期間のログはありません</p>
                )}
            </CardContent>
        </Card>
      )}


      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-lg animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
            <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {selectedCategory}
                  <Badge variant="secondary" className="text-xs font-normal">
                    {categoryStats[selectedCategory]}分
                  </Badge>
                </CardTitle>
                <p className="text-xs text-gray-500 mt-1">全 {selectedCategoryLogs.length} 件のログ</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCategory(null)} className="-mr-2">
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto p-0">
              {selectedCategoryLogs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">ログがありません</div>
              ) : (
                <div className="divide-y">
                  {selectedCategoryLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{log.date}</span>
                          {log.tags && log.tags.length > 0 && (
                            <div className="flex gap-1">
                              {log.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{log.minutes}分</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-300 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(log.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <h3 className="font-medium text-gray-900 break-words">{log.did}</h3>
                      {log.learned && (
                        <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap break-words border-l-2 border-gray-200 pl-2 ml-0.5">
                          {log.learned}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
