'use client';

import { useState, useCallback, useMemo } from 'react';
import { v4 as generateUUID } from 'uuid';
import { getLogs, getTodos, getSettings, saveLog, saveTodo, updateTodo as updateTodoStore } from '@/lib/stacklog-store';
import { calculateStreak, getLocalDateString, getTodaysTotalMinutes } from '@/lib/stacklog-logic';
import type { Log, Todo, Settings } from '@/types/stacklog';
import { TaskActionData } from '@/components/TaskActionModal';

export function useStackLog() {
  const [slLogs, setSlLogs] = useState<Log[]>([]);
  const [slTodos, setSlTodos] = useState<Todo[]>([]);
  const [slSettings, setSlSettings] = useState<Settings | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'complete' | 'edit' | 'create'>('create');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

  const loadSlData = useCallback(async () => {
    try {
      const [fetchedLogs, fetchedTodos, fetchedSettings] = await Promise.all([
        getLogs(),
        getTodos(),
        getSettings()
      ]);
      setSlLogs(fetchedLogs);
      setSlTodos(fetchedTodos);
      setSlSettings(fetchedSettings);
    } catch (err) {
      console.error("Failed to load StackLog data:", err);
    }
  }, []);

  const handleTaskAction = useCallback(async (data: TaskActionData) => {
    try {
      if (modalMode === 'complete' && selectedTodo) {
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
        await saveLog(log);

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
        await updateTodoStore(updated);
      } else if (modalMode === 'create') {
        const newTodo: Todo = {
          id: generateUUID(),
          text: data.text,
          details: data.details || undefined,
          minutes: data.minutes,
          category: data.category || undefined,
          completed: false,
          createdAt: new Date().toISOString(),
          priority: data.priority,
          scheduleType: data.scheduleType || 'none',
          dueDate: data.dueDate,
          scheduleDays: data.scheduleDays,
          startTime: data.startTime,
          endTime: data.endTime,
        };
        await saveTodo(newTodo);
      }
      await loadSlData();
    } catch (err) {
      console.error("Task action failed:", err);
    }
  }, [modalMode, selectedTodo, loadSlData]);

  const handleOpenCompleteModal = useCallback((todo: Todo) => {
    setSelectedTodo(todo);
    setModalMode('complete');
    setIsModalOpen(true);
  }, []);

  const slStreak = useMemo(() => calculateStreak(slLogs), [slLogs]);
  const slTodayMinutes = useMemo(() => getTodaysTotalMinutes(slLogs), [slLogs]);
  const slDailyGoal = slSettings?.dailyGoal || 120;
  const slTotalMinutes = useMemo(() => slLogs.reduce((acc, l) => acc + l.minutes, 0), [slLogs]);
  const slSortedLogs = useMemo(() => [...slLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [slLogs]);
  const slIncompleteTodos = useMemo(() => slTodos.filter(t => !t.completed), [slTodos]);

  return {
    slLogs,
    slTodos,
    slSettings,
    isModalOpen, setIsModalOpen,
    modalMode, setModalMode,
    selectedTodo, setSelectedTodo,
    loadSlData,
    handleTaskAction,
    handleOpenCompleteModal,
    slStreak,
    slTodayMinutes,
    slDailyGoal,
    slTotalMinutes,
    slSortedLogs,
    slIncompleteTodos,
  };
}
