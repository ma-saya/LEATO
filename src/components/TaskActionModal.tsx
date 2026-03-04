'use client';

import { useState, useEffect } from 'react';
import { Todo, ScheduleType } from '@/types/stacklog';
import { getLocalDateString } from '@/lib/stacklog-logic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, Pencil, Calendar, Repeat, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const getToday = () => getLocalDateString();

interface TaskActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'complete' | 'edit' | 'create';
  todo?: Todo;
  categories: string[];
  onSubmit: (data: TaskActionData) => void;
}

export interface TaskActionData {
  text: string;
  details: string;
  minutes?: number;
  category: string;
  priority?: 'high' | 'medium' | 'low';
  scheduleType?: ScheduleType;
  dueDate?: string;
  scheduleDays?: number[];
  dueTime?: string;
  reminderMinutesBefore?: number;
  startTime?: string;
  endTime?: string;
  syncToReport?: boolean;
}

function buildInitialData(mode: 'complete' | 'edit' | 'create', todo: Todo | undefined, categories: string[]): TaskActionData {
  if (mode === 'create') {
    return {
      text: '',
      details: '',
      category: categories[0] || '',
      priority: 'medium',
      scheduleType: 'none',
      dueDate: '',
      scheduleDays: [],
      dueTime: '',

      reminderMinutesBefore: 0,
      syncToReport: false,
    };
  }

  if (!todo) {
    return {
      text: '',
      details: '',
      category: categories[0] || '',
    };
  }

  return {
    text: todo.text,
    details: todo.details || '',
    category: todo.category || (categories[0] || ''),
    priority: todo.priority || 'medium',
    scheduleType: todo.scheduleType,
    dueDate: todo.dueDate,
    scheduleDays: todo.scheduleDays || [],
    dueTime: todo.dueTime,
    reminderMinutesBefore: todo.reminderMinutesBefore,
    startTime: todo.startTime || '',
    endTime: todo.endTime || '',
    syncToReport: todo.syncToReport || false,
  };
}

export function TaskActionModal({ 
  isOpen, 
  onClose, 
  mode, 
  todo, 
  categories, 
  onSubmit 
}: TaskActionModalProps) {
  const [data, setData] = useState<TaskActionData>(() => buildInitialData(mode, todo, categories));
  const [hours, setHours] = useState(() => {
    const m = todo?.minutes || 0;
    return m >= 60 ? Math.floor(m / 60).toString() : '';
  });
  const [minutes, setMinutesPart] = useState(() => {
    const m = todo?.minutes || 0;
    return m > 0 ? (m % 60).toString() : '';
  });

  useEffect(() => {
    if (isOpen) {
      setData(buildInitialData(mode, todo, categories));
      const m = todo?.minutes || 0;
      setHours(m >= 60 ? Math.floor(m / 60).toString() : '');
      setMinutesPart(m > 0 ? (m % 60).toString() : '');
    }
  }, [isOpen, mode, todo, categories]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    onSubmit({
        ...data,
        minutes: totalMinutes > 0 ? totalMinutes : undefined,

        startTime: data.startTime,
        endTime: data.endTime,
        syncToReport: data.syncToReport,
    });
    onClose();
  };

  const updateData = (updates: Partial<TaskActionData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const toggleScheduleDay = (day: number) => {
    const currentDays = data.scheduleDays || [];
    const newDays = currentDays.includes(day) 
        ? currentDays.filter(d => d !== day) 
        : [...currentDays, day].sort();
    updateData({ scheduleDays: newDays });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md shadow-lg animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
          <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {mode === 'complete' ? (
                    <>
                        <Check className="h-5 w-5 text-green-600" />
                        ログを記録して完了
                    </>
                ) : mode === 'create' ? (
                    <>
                        <Check className="h-5 w-5 text-indigo-600" />
                        新しいタスクを追加
                    </>
                ) : (
                    <>
                        <Pencil className="h-5 w-5 text-blue-600" />
                        タスクの編集
                    </>
                )}
              </CardTitle>
              {mode === 'complete' && (
                  <p className="text-xs text-gray-500 mt-1">学習時間を入力するとレポートやカレンダーに反映されます</p>
              )}
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
                  <label className="text-sm font-medium">内容は？</label>
                  <Input 
                      value={data.text} 
                      onChange={(e) => updateData({ text: e.target.value })} 
                  />
              </div>
              
              {/* Schedule Edit (Create or Edit mode) */}
              {(mode === 'edit' || mode === 'create') && (
                  <>
                  <div className="space-y-2 p-3 bg-gray-50 rounded-md">
                    <label className="text-xs font-medium text-gray-600 mb-2 block">スケジュール設定</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {([
                            { type: 'none' as ScheduleType, label: 'なし', icon: null },
                            { type: 'once' as ScheduleType, label: '日付指定', icon: <Calendar className="h-3 w-3 mr-1" /> },
                            { type: 'daily' as ScheduleType, label: '毎日', icon: <Repeat className="h-3 w-3 mr-1" /> },
                            { type: 'weekdays' as ScheduleType, label: '曜日指定', icon: <CalendarDays className="h-3 w-3 mr-1" /> },
                        ]).map(opt => (
                            <button
                                key={opt.type}
                                type="button"
                                onClick={() => updateData({ scheduleType: opt.type })}
                                className={cn(
                                    "px-2 py-1 rounded text-xs border transition-colors flex items-center",
                                    data.scheduleType === opt.type 
                                        ? "bg-black text-white border-black" 
                                        : "bg-white text-gray-600 border-gray-200"
                                )}
                            >
                                {opt.icon}{opt.label}
                            </button>
                        ))}
                    </div>
                    {data.scheduleType === 'once' && (
                        <Input 
                            type="date" 
                            value={data.dueDate || ''}
                            onChange={(e) => updateData({ dueDate: e.target.value })}
                            min={getToday()}
                            className="text-sm bg-white"
                        />
                    )}
                    {data.scheduleType === 'weekdays' && (
                        <div className="flex gap-1">
                            {DAY_LABELS.map((label, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => toggleScheduleDay(i)}
                                    className={cn(
                                        "w-8 h-8 rounded-full text-xs font-medium border transition-colors",
                                        (data.scheduleDays || []).includes(i)
                                            ? "bg-black text-white border-black"
                                            : "bg-white text-gray-500 border-gray-200"
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}
                  </div>
                  {/* Edit Priority */}
                  <div className="space-y-4 mt-4 pt-4 border-t border-dashed">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-600">優先度</label>
                             <div className="flex gap-2">
                                {([
                                    { value: 'high', label: '高', color: 'bg-red-100 text-red-700 border-red-200' },
                                    { value: 'medium', label: '中', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                                    { value: 'low', label: '低', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                                ] as const).map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => updateData({ priority: p.value })}
                                        className={cn(
                                            "px-3 py-1 text-xs rounded-full border transition-all",
                                            data.priority === p.value 
                                                ? `${p.color} ring-1 ring-offset-1 ring-black` 
                                                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                             </div>
                        </div>

                         {/* Reminder Settings */}
                        {(data.scheduleType !== 'none') && (
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-600">通知・リマインダー</label>
                                <div className="flex gap-2 items-center">
                                    <Input 
                                        type="time"
                                        value={data.dueTime || ''}
                                        onChange={(e) => updateData({ dueTime: e.target.value })}
                                        className="text-xs w-24 h-8"
                                    />
                                    <select
                                        value={data.reminderMinutesBefore || 0}
                                        onChange={(e) => updateData({ reminderMinutesBefore: parseInt(e.target.value) })}
                                        className="text-xs h-8 border rounded px-1"
                                    >
                                        <option value="0">なし</option>
                                        <option value="5">5分前</option>
                                        <option value="15">15分前</option>
                                        <option value="30">30分前</option>
                                        <option value="60">1時間前</option>
                                    </select>
                                </div>
                            </div>
                        )}
                     </div>
                  </div>
                  </>
              )}

               {/* Start/End Time Inputs */}
              {(mode === 'edit' || mode === 'create') && (
                  <div className="space-y-4 pt-4 border-t border-dashed">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => updateData({ syncToReport: !data.syncToReport })}
                            className={cn(
                                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                                data.syncToReport ? "bg-black" : "bg-gray-200"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm",
                                    data.syncToReport ? "translate-x-[18px]" : "translate-x-[3px]"
                                )}
                            />
                        </button>
                        <label className="text-xs font-medium text-gray-600">学習レポートと連携</label>
                    </div>

                    {data.syncToReport && (
                        <div className="space-y-2 pl-4 border-l-2 border-gray-100">
                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                  <label className="text-xs text-gray-500">開始</label>
                                  <Input 
                                      type="time" 
                                      value={data.startTime || ''}
                                      onChange={(e) => {
                                          const newStart = e.target.value;
                                          let newMinutes = hours ? parseInt(hours) * 60 + parseInt(minutes || '0') : 0;
                                          
                                          // Auto-calculate duration if EndTime exists
                                          if (newStart && data.endTime) {
                                              const start = new Date(`2000/01/01 ${newStart}`);
                                              const end = new Date(`2000/01/01 ${data.endTime}`);
                                              if (end > start) {
                                                  const diff = (end.getTime() - start.getTime()) / 60000;
                                                  const h = Math.floor(diff / 60);
                                                  const m = diff % 60;
                                                  setHours(h.toString());
                                                  setMinutesPart(m.toString());
                                                  newMinutes = diff;
                                              }
                                          }
                                          
                                          updateData({ startTime: newStart });
                                      }}
                                      className="text-sm bg-white"
                                  />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-xs text-gray-500">終了</label>
                                  <Input 
                                      type="time" 
                                      value={data.endTime || ''}
                                      onChange={(e) => {
                                          const newEnd = e.target.value;
                                          
                                          // Auto-calculate duration if StartTime exists
                                          if (data.startTime && newEnd) {
                                              const start = new Date(`2000/01/01 ${data.startTime}`);
                                              const end = new Date(`2000/01/01 ${newEnd}`);
                                              if (end > start) {
                                                  const diff = (end.getTime() - start.getTime()) / 60000;
                                                  const h = Math.floor(diff / 60);
                                                  const m = diff % 60;
                                                  setHours(h.toString());
                                                  setMinutesPart(m.toString());
                                              }
                                          }
                                          updateData({ endTime: newEnd });
                                      }}
                                      className="text-sm bg-white"
                                  />
                              </div>
                           </div>
                        </div>
                    )}
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {mode === 'complete' ? "学習時間" : "目標時間"}
                        {mode === 'complete' && <span className="text-red-400 ml-1">*</span>}
                      </label>
                       <div className="flex gap-2 items-center">
                            <div className="relative flex-1">
                                <Input 
                                    type="number" 
                                    min="0"
                                    value={hours} 
                                    onChange={(e) => setHours(e.target.value)} 
                                    className="text-sm pr-6"
                                    placeholder="0"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">h</span>
                            </div>
                            <div className="relative flex-1">
                                <Input 
                                    type="number" 
                                    min="0"
                                    max="59"
                                    value={minutes} 
                                    onChange={(e) => setMinutesPart(e.target.value)} 
                                    className="text-sm pr-7"
                                    placeholder="0"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">min</span>
                            </div>
                        </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-sm font-medium">カテゴリ</label>
                      <div className="flex flex-wrap gap-1">
                          {categories.map(cat => (
                              <button
                                  key={cat}
                                  type="button"
                                  onClick={() => updateData({ category: cat })}
                                  className={cn(
                                      "px-2 py-1 rounded text-[10px] border transition-colors",
                                      data.category === cat 
                                          ? "bg-black text-white border-black" 
                                          : "bg-white text-gray-600 border-gray-200"
                                  )}
                              >
                                  {cat}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
              <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {mode === 'complete' ? "学び・メモ" : "詳細・メモ"}
                  </label>
                  <Textarea 
                      value={data.details} 
                      onChange={(e) => updateData({ details: e.target.value })} 
                      className="h-24"
                      placeholder={mode === 'complete' ? "学んだことやメモを記入（オプション）" : "詳細を入力"}
                  />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={onClose}>
                      キャンセル
                  </Button>
                  <Button onClick={handleSubmit}>
                      {mode === 'complete' ? 'ログを記録して完了' : mode === 'create' ? '追加する' : '更新する'}
                  </Button>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
