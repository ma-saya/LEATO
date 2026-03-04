'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTodos, saveTodo, deleteTodo, deleteTodos, updateTodo, getSettings, saveLog, deleteLog, reorderTodos } from '@/lib/stacklog-store';
import { Todo, Log, ScheduleType } from '@/types/stacklog';
import { getLocalDateString } from '@/lib/stacklog-logic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Check, Trash2, ArrowLeft, Plus, AlertTriangle, Calendar, Repeat, CalendarDays, Pencil, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { v4 as generateUUID } from 'uuid';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { CategorySelect } from '@/components/CategorySelect';
import { CategoryPills } from '@/components/CategoryPills';
import { TaskActionModal, TaskActionData } from '@/components/TaskActionModal';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const getToday = () => getLocalDateString();

const isOverdue = (todo: Todo): boolean => {
  if (todo.completed) return false;
  if (todo.scheduleType !== 'once' || !todo.dueDate) return false;
  return todo.dueDate < getToday();
};

const shouldHideCompleted = (todo: Todo): boolean => {
  if (!todo.completed) return false;
  if (todo.scheduleType === 'once' && todo.dueDate && todo.dueDate < getToday()) return true;
  return false;
};

const isRelevantToday = (todo: Todo): boolean => {
  if (!todo.scheduleType || todo.scheduleType === 'none' || todo.scheduleType === 'once') return true;
  const dayOfWeek = new Date().getDay();
  if (todo.scheduleType === 'daily') return true;
  if (todo.scheduleType === 'weekdays' && todo.scheduleDays) {
    return todo.scheduleDays.includes(dayOfWeek);
  }
  return true;
};

const formatDueLabel = (todo: Todo): string | null => {
  if (!todo.scheduleType || todo.scheduleType === 'none') return null;
  if (todo.scheduleType === 'once' && todo.dueDate) {
    const d = todo.dueDate;
    const today = getToday();
    if (d === today) return '今日';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d === getLocalDateString(tomorrow)) return '明日';
    const [, m, day] = d.split('-');
    return `${parseInt(m)}/${parseInt(day)}`;
  }
  if (todo.scheduleType === 'daily') return '毎日';
  if (todo.scheduleType === 'weekdays' && todo.scheduleDays) {
    return todo.scheduleDays.map(d => DAY_LABELS[d]).join('・');
  }
  return null;
};

// Sortable Todo Item Component
function SortableTodoItem({ 
  todo, 
  handleToggle, 
  handleEditClick, 
  handleDelete,
  isSelected,
  onSelect, 
  isSelectionMode,
}: { 
  todo: Todo; 
  handleToggle: (t: Todo) => void; 
  handleEditClick: (t: Todo) => void; 
  handleDelete: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  isSelectionMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as any,
  };

  const overdue = isOverdue(todo);
  const dueLabel = formatDueLabel(todo);
  
  const priorityColor = {
      high: 'border-l-4 border-l-red-500',
      medium: 'border-l-4 border-l-yellow-400',
      low: 'border-l-4 border-l-blue-400',
  }[todo.priority || 'medium'];

  return (
    <div ref={setNodeRef} style={style} className="mb-2 touch-none">
       <Card className={cn(
            "group hover:shadow-sm transition-shadow pl-1 bg-card",
            overdue && "bg-destructive/10",
            priorityColor
        )}>
          <CardContent className="p-4 flex items-start gap-3">
              <div className="flex flex-col gap-2 mt-1.5 flex-shrink-0">
                  <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
                       <GripVertical className="h-4 w-4" />
                  </div>
                  {isSelectionMode && (
                    <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect(todo.id, e.target.checked)}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-ring cursor-pointer"
                    />
                  )}
              </div>
              <button 
                onClick={() => handleToggle(todo)}
                className={cn(
                  "mt-1 h-5 w-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors bg-background",
                  overdue ? "border-destructive hover:border-destructive/80" : "border-input hover:border-primary"
                )}
              >
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {overdue && (
                        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    )}
                    <p className={cn(
                        "font-medium break-words leading-tight",
                        overdue ? "text-destructive" : "text-foreground"
                    )}>{todo.text}</p>
                    {todo.category && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">{todo.category}</Badge>
                    )}
                    {todo.minutes && (
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1 rounded">
                            {Math.floor(todo.minutes / 60) > 0 ? `${Math.floor(todo.minutes / 60)}h ` : ''}
                            {todo.minutes % 60}m
                        </span>
                    )}
                    {dueLabel && (
                        <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5",
                            overdue ? "bg-destructive/10 text-destructive" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        )}>
                            {todo.scheduleType === 'daily' || todo.scheduleType === 'weekdays' 
                                ? <Repeat className="h-2.5 w-2.5" /> 
                                : <Calendar className="h-2.5 w-2.5" />
                            }
                            {dueLabel}
                        </span>
                    )}
                    {todo.dueTime && (
                       <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-0.5 font-mono">
                            <Clock className="h-2.5 w-2.5" />
                            {todo.dueTime}
                            {todo.reminderMinutesBefore ? ` (-${todo.reminderMinutesBefore}m)` : ''}
                       </span>
                    )}
                </div>
                {overdue && (
                    <p className="text-xs text-destructive mt-0.5">⚠ 期限切れ</p>
                )}
                {todo.details && (
                    <p className="text-sm text-muted-foreground mt-1 break-words whitespace-pre-wrap">{todo.details}</p>
                )}
              </div>
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleEditClick(todo)}
                    className="text-muted-foreground/50 hover:text-primary h-8 w-8"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(todo.id)}
                    className="text-muted-foreground/50 hover:text-destructive h-8 w-8"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
          </CardContent>
        </Card>
    </div>
  );
}

export default function TasksPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  // Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // New Task State
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoDetails, setNewTodoDetails] = useState('');
  const [newTodoHours, setNewTodoHours] = useState('');
  const [newTodoMinutes, setNewTodoMinutes] = useState('');
  const [newTodoCategory, setNewTodoCategory] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'high' | 'medium' | 'low'>('medium');

  // Schedule State for new todo
  const [newScheduleType, setNewScheduleType] = useState<ScheduleType>('none');
  const [newDueDate, setNewDueDate] = useState('');
  const [newScheduleDays, setNewScheduleDays] = useState<number[]>([]);
  const [newDueTime, setNewDueTime] = useState('');
  const [newReminderMinutes, setNewReminderMinutes] = useState(0);
  const [newSyncToReport, setNewSyncToReport] = useState(false);
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isDetailMode, setIsDetailMode] = useState(false);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'complete' | 'edit'>('complete');
  const [selectedTodo, setSelectedTodo] = useState<Todo | undefined>(undefined);

  // Batch Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      await loadTodos();
      const settings = await getSettings();
      setCategories(settings.categories);
      if (settings.categories.length > 0) {
          setNewTodoCategory(settings.categories[0]);
      }
    };
    load();
  }, []);

  const loadTodos = async () => {
    const loaded = await getTodos();
    setTodos(loaded);
    setIsLoading(false);
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;

    const totalMinutes = (parseInt(newTodoHours) || 0) * 60 + (parseInt(newTodoMinutes) || 0);

    const newTodo: Todo = {
      id: generateUUID(),
      text: newTodoText,
      details: isDetailMode ? newTodoDetails : undefined,
      minutes: isDetailMode && totalMinutes > 0 ? totalMinutes : undefined,
      category: isDetailMode && newTodoCategory ? newTodoCategory : undefined,
      completed: false,
      createdAt: new Date().toISOString(),
      scheduleType: isDetailMode ? newScheduleType : 'none',
      dueDate: isDetailMode && newScheduleType === 'once' ? newDueDate : undefined,
      scheduleDays: isDetailMode && newScheduleType === 'weekdays' ? newScheduleDays : undefined,
      priority: isDetailMode ? newTodoPriority : 'medium',
      dueTime: isDetailMode && newScheduleType !== 'none' ? newDueTime : undefined,
      reminderMinutesBefore: isDetailMode && newScheduleType !== 'none' ? newReminderMinutes : undefined,
      syncToReport: isDetailMode ? newSyncToReport : undefined,
      startTime: isDetailMode && newSyncToReport && newStartTime ? newStartTime : undefined,
      endTime: isDetailMode && newSyncToReport && newEndTime ? newEndTime : undefined,
    };

    saveTodo(newTodo);
    setNewTodoText('');
    setNewTodoDetails('');
    setNewTodoHours('');
    setNewTodoMinutes('');
    setNewScheduleType('none');
    setNewDueDate('');
    setNewScheduleDays([]);
    setNewDueTime('');
    setNewReminderMinutes(0);
    setNewTodoPriority('medium');
    setNewSyncToReport(false);
    setNewStartTime('');
    setNewEndTime('');
    loadTodos();
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active && over && active.id !== over.id) {
      setTodos((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        
        const newOrder = arrayMove(items, oldIndex, newIndex);
        reorderTodos(newOrder); // Save to store
        return newOrder;
      });
    }
  };

  // Open modal for COMPLETION
  const handleToggle = (todo: Todo) => {
    if (todo.completed) {
      // If unchecking, remove the associated log if it exists
      if (todo.relatedLogId) {
          deleteLog(todo.relatedLogId);
      }
      // Update todo to remove relatedLogId and set completed to false
      const updated = { ...todo, completed: false, relatedLogId: undefined, completedAt: undefined };
      updateTodo(updated);
      loadTodos();
      return;
    }

    setSelectedTodo(todo);
    setModalMode('complete');
    setIsModalOpen(true);
  };

  // Open modal for EDITING
  const handleEditClick = (todo: Todo) => {
    setSelectedTodo(todo);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleModalSubmit = (data: TaskActionData) => {
    if (!selectedTodo) return;

    if (modalMode === 'complete') {
        const logId = generateUUID();
        const log: Log = {
            id: logId,
            date: getLocalDateString(),
            did: data.text,
            learned: data.details || undefined,
            minutes: data.minutes || 0,
            category: data.category || 'その他',
            tags: ['タスク完了'],
            createdAt: new Date().toISOString(),
            startTime: data.startTime,
            endTime: data.endTime,
        };
        saveLog(log);

        const isRecurring = selectedTodo.scheduleType === 'daily' || selectedTodo.scheduleType === 'weekdays';
        const updated: Todo = {
            ...selectedTodo,
            text: data.text,
            details: data.details,
            minutes: data.minutes,
            category: data.category,
            completed: isRecurring ? false : true,
            completedAt: new Date().toISOString(),
            relatedLogId: logId,
        };
        updateTodo(updated);

    } else {
        // Edit mode
        const updated: Todo = {
            ...selectedTodo,
            text: data.text,
            details: data.details,
            minutes: data.minutes,
            category: data.category,
            priority: data.priority,
            scheduleType: data.scheduleType,
            dueDate: data.dueDate,
            scheduleDays: data.scheduleDays,
            dueTime: data.dueTime,
            reminderMinutesBefore: data.reminderMinutesBefore,
            syncToReport: data.syncToReport,
            startTime: data.startTime,
            endTime: data.endTime,
        };
        updateTodo(updated);
    }
    loadTodos();
  };

  const handleDelete = (id: string) => {
    if (confirm('このタスクを削除しますか？')) {
      deleteTodo(id);
      loadTodos();
    }
  };

  const toggleScheduleDay = (day: number) => {
    setNewScheduleDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  // Batch Selection Handlers
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedTaskIds(new Set());
  };

  const toggleTaskSelection = (id: string, selected: boolean) => {
    const newSet = new Set(selectedTaskIds);
    if (selected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedTaskIds(newSet);
  };

  const handleSelectAllTasks = () => {
    if (selectedTaskIds.size === incompleteTodos.length) {
      setSelectedTaskIds(new Set());
    } else {
      const newSet = new Set(incompleteTodos.map(t => t.id));
      setSelectedTaskIds(newSet);
    }
  };

  const handleBatchDeleteTasks = () => {
    if (selectedTaskIds.size === 0) return;
    if (confirm(`選択した ${selectedTaskIds.size} 件のタスクを削除しますか？`)) {
      deleteTodos(Array.from(selectedTaskIds));
      setSelectedTaskIds(new Set());
      setIsSelectionMode(false);
      loadTodos();
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  const today = getToday();
  const visibleTodos = todos.filter(t => !shouldHideCompleted(t));

  const isCompletedToday = (todo: Todo): boolean => {
    if (!todo.completedAt) return false;
    return todo.completedAt.split('T')[0] === today;
  };

  const incompleteTodos = visibleTodos.filter(t => {
    if (selectedCategory !== 'ALL' && (t.category || 'その他') !== selectedCategory) return false;

    if (t.completed) return false;
    if ((t.scheduleType === 'daily' || t.scheduleType === 'weekdays') && isCompletedToday(t)) return false;
    return isRelevantToday(t);
  });

  const completedTodos = visibleTodos.filter(t => {
    if (t.completed) return true;
    if ((t.scheduleType === 'daily' || t.scheduleType === 'weekdays') && isCompletedToday(t)) return true;
    return false;
  });

  const sortedIncomplete = [...incompleteTodos].sort((a, b) => {
    const aOverdue = isOverdue(a) ? 0 : 1;
    const bOverdue = isOverdue(b) ? 0 : 1;
    return aOverdue - bOverdue;
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">タスク管理</h1>
            <Button 
                variant={isDetailMode ? "default" : "outline"}
                size="sm"
                onClick={() => setIsDetailMode(!isDetailMode)}
                className="text-xs h-7"
            >
                {isDetailMode ? '詳細モード ON' : '詳細モード OFF'}
            </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>新しいタスクを追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddTodo} className="space-y-3">
            <div className="flex gap-2">
                <Input 
                placeholder="例: AWS Lambdaのドキュメントを読む" 
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                className="flex-1"
                disabled={isSelectionMode}
                />
                <Button type="submit" disabled={isSelectionMode}>
                <Plus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">追加</span>
                </Button>
            </div>
            {isDetailMode && (
                <div className="space-y-4">
                    {/* Schedule Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">スケジュール</label>

                        <div className="flex flex-wrap gap-2">
                            {([
                                { type: 'none' as ScheduleType, label: 'なし', icon: null },
                                { type: 'once' as ScheduleType, label: '日付指定', icon: <Calendar className="h-3 w-3 mr-1" /> },
                                { type: 'daily' as ScheduleType, label: '毎日', icon: <Repeat className="h-3 w-3 mr-1" /> },
                                { type: 'weekdays' as ScheduleType, label: '曜日指定', icon: <CalendarDays className="h-3 w-3 mr-1" /> },
                            ]).map(opt => (
                                <button
                                    key={opt.type}
                                    type="button"
                                    onClick={() => setNewScheduleType(opt.type)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-md text-xs border transition-colors flex items-center",
                                        newScheduleType === opt.type 
                                            ? "bg-primary text-primary-foreground border-primary" 
                                            : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    {opt.icon}{opt.label}
                                </button>
                            ))}
                        </div>

                        {newScheduleType === 'once' && (
                            <Input 
                                type="date" 
                                value={newDueDate}
                                onChange={(e) => setNewDueDate(e.target.value)}
                                min={getToday()}
                                className="text-sm w-48"
                            />
                        )}

                        {newScheduleType === 'weekdays' && (
                            <div className="flex gap-1">
                                {DAY_LABELS.map((label, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => toggleScheduleDay(i)}
                                        className={cn(
                                            "w-9 h-9 rounded-full text-xs font-medium border transition-colors",
                                            newScheduleDays.includes(i)
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {newScheduleType !== 'none' && (
                             <div className="flex gap-2 items-center mt-2 pt-2 border-t border-dashed border-border">
                                <label className="text-xs font-medium text-muted-foreground">時間通知</label>
                                <Input 
                                    type="time"
                                    value={newDueTime}
                                    onChange={(e) => setNewDueTime(e.target.value)}
                                    className="text-xs w-24 h-8"
                                />
                                <select
                                    value={newReminderMinutes}
                                    onChange={(e) => setNewReminderMinutes(parseInt(e.target.value))}
                                    className="text-xs h-8 border rounded px-1 bg-background border-input text-foreground"
                                >
                                    <option value="0">通知なし</option>
                                    <option value="5">5分前</option>
                                    <option value="15">15分前</option>
                                    <option value="30">30分前</option>
                                    <option value="60">1時間前</option>
                                </select>
                             </div>
                        )}
                    </div>

                    {/* Time & Category */}
                    <div className="flex gap-3">
                         <div className="w-40 flex gap-1 items-center">
                            <div className="relative flex-1">
                                <Input 
                                    type="number" 
                                    min="0"
                                    value={newTodoHours}
                                    onChange={(e) => setNewTodoHours(e.target.value)}
                                    className="text-sm pr-6"
                                    placeholder="0"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">h</span>
                            </div>
                            <div className="relative flex-1">
                                <Input 
                                    type="number" 
                                    min="0"
                                    max="59"
                                    value={newTodoMinutes}
                                    onChange={(e) => setNewTodoMinutes(e.target.value)}
                                    className="text-sm pr-7"
                                    placeholder="0"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                            </div>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2 items-center">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setNewTodoCategory(cat)}
                                    className={cn(
                                        "px-2 py-1 rounded-md text-xs border transition-colors",
                                        newTodoCategory === cat 
                                            ? "bg-primary text-primary-foreground border-primary" 
                                            : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sync to Learning Report */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setNewSyncToReport(!newSyncToReport)}
                                className={cn(
                                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
                                    newSyncToReport ? "bg-primary" : "bg-muted"
                                )}
                            >
                                <span
                                    className={cn(
                                        "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm",
                                        newSyncToReport ? "translate-x-[18px]" : "translate-x-[3px]"
                                    )}
                                />
                            </button>
                            <label className="text-xs font-medium text-muted-foreground">学習レポートと連携</label>
                        </div>
                        {newSyncToReport && (
                            <div className="flex gap-2 items-center pl-12">
                                <label className="text-xs text-muted-foreground">開始</label>
                                <Input 
                                    type="time"
                                    value={newStartTime}
                                    onChange={(e) => setNewStartTime(e.target.value)}
                                    className="text-xs w-24 h-8"
                                />
                                <label className="text-xs text-muted-foreground">終了</label>
                                <Input 
                                    type="time"
                                    value={newEndTime}
                                    onChange={(e) => setNewEndTime(e.target.value)}
                                    className="text-xs w-24 h-8"
                                />
                            </div>
                        )}
                    </div>

                    {/* Priority */}
                    <div className="space-y-2">
                         <label className="text-xs font-medium text-muted-foreground">優先度</label>
                         <div className="flex gap-2">
                            {([
                                { value: 'high', label: '高', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200/20' },
                                { value: 'medium', label: '中', color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200/20' },
                                { value: 'low', label: '低', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/20' },
                            ] as const).map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setNewTodoPriority(p.value)}
                                    className={cn(
                                        "px-3 py-1 text-xs rounded-full border transition-all",
                                        newTodoPriority === p.value 
                                            ? `${p.color} ring-1 ring-offset-1 ring-offset-background ring-primary` 
                                            : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-accent-foreground"
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                         </div>
                    </div>

                    <Textarea 
                        placeholder="詳細（オプション）: 読む章やメモなど"
                        value={newTodoDetails}
                        onChange={(e) => setNewTodoDetails(e.target.value)}
                        className="text-sm h-20"
                    />
                </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Bulk Action & Filter Section */}
      <div className="space-y-2">
          <div className="flex items-center justify-between">
              <div className="h-9 flex items-center gap-2">
                {!isSelectionMode ? (
                  <div className="relative inline-block text-left w-40">
                    <CategorySelect
                        value={selectedCategory}
                        onChange={setSelectedCategory}
                        categories={categories}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={toggleSelectionMode}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        キャンセル
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleSelectAllTasks}
                        className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400"
                    >
                        {selectedTaskIds.size === incompleteTodos.length ? '全解除' : 'すべて選択'}
                    </Button>
                    <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleBatchDeleteTasks}
                        disabled={selectedTaskIds.size === 0}
                        className="text-xs"
                    >
                        削除 ({selectedTaskIds.size})
                    </Button>
                  </div>
                )}
              </div>
          </div>
          
          {!isSelectionMode && (
              <CategoryPills 
                categories={categories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
          )}
      </div>

      {/* Incomplete Tasks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">未完了 ({sortedIncomplete.length})</h2>
            {!isSelectionMode && sortedIncomplete.length > 0 && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={toggleSelectionMode}
                    className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                >
                    選択
                </Button>
            )}
        </div>

        {sortedIncomplete.length === 0 && (
          <p className="text-sm text-muted-foreground italic">タスクはありません。今日も素晴らしい一日を！</p>
        )}
        
        {isSelectionMode ? (
             <div className="space-y-2">
                {sortedIncomplete.map(todo => (
                    <SortableTodoItem 
                        key={todo.id} 
                        todo={todo} 
                        handleToggle={handleToggle} 
                        handleEditClick={handleEditClick} 
                        handleDelete={handleDelete} 
                        isSelected={selectedTaskIds.has(todo.id)}
                        onSelect={toggleTaskSelection}
                        isSelectionMode={isSelectionMode}
                    />
                ))}
             </div>
        ) : (
            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={sortedIncomplete.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                    {sortedIncomplete.map(todo => (
                        <SortableTodoItem 
                            key={todo.id} 
                            todo={todo} 
                            handleToggle={handleToggle} 
                            handleEditClick={handleEditClick} 
                            handleDelete={handleDelete} 
                            isSelected={false}
                            isSelectionMode={false}
                            onSelect={() => {}}
                        />
                    ))}
                    </div>
                </SortableContext>
            </DndContext>
        )}
      </div>

      {/* Completed Tasks */}
      {completedTodos.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-lg font-semibold text-muted-foreground">完了済み ({completedTodos.length})</h2>
           <div className="space-y-2">
            {completedTodos.map(todo => (
              <Card key={todo.id} className="bg-muted/30 border-border group">
                <CardContent className="p-4 flex items-start gap-3">
                     <button 
                      onClick={() => handleToggle(todo)}
                      className="mt-1 h-5 w-5 rounded bg-primary border border-primary flex-shrink-0 flex items-center justify-center text-primary-foreground"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-muted-foreground line-through decoration-muted-foreground/50 font-medium break-words leading-tight">{todo.text}</p>
                            {todo.category && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-5 text-muted-foreground border-border">{todo.category}</Badge>
                            )}
                            {formatDueLabel(todo) && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-0.5">
                                    <Check className="h-2 w-2" />
                                    {formatDueLabel(todo)}
                                </span>
                            )}
                        </div>
                        {todo.details && (
                            <p className="text-xs text-muted-foreground/70 mt-1 break-words line-clamp-1">{todo.details}</p>
                        )}
                    </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEditClick(todo)}
                        className="text-muted-foreground/50 hover:text-primary h-8 w-8"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDelete(todo.id)}
                        className="text-muted-foreground/50 hover:text-destructive h-8 w-8"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Task Action Modal */}
      <TaskActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        todo={selectedTodo}
        categories={categories}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
}
