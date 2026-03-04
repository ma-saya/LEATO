export type Category = string;

export interface Settings {
  dailyGoal: number; // minutes
  weeklyGoal: number; // minutes
  categories: string[];
  categoryColors?: Record<string, string>; // Category -> Hex Color
}

export interface Log {
  id: string;
  date: string; // YYYY-MM-DD
  did: string;
  learned?: string;
  next?: string;
  minutes: number;
  category: Category;
  tags: string[];
  createdAt: string; // ISO
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

export type ScheduleType = 'none' | 'once' | 'daily' | 'weekdays';

export interface Todo {
  id: string;
  text: string;
  details?: string;
  minutes?: number; // Target study time
  category?: string;
  completed: boolean;
  createdAt: string; // ISO
  scheduleType?: ScheduleType; // none=no date, once=specific date, daily=every day, weekdays=specific days
  dueDate?: string; // YYYY-MM-DD (for 'once')
  scheduleDays?: number[]; // 0=Sun..6=Sat (for 'weekdays')
  completedAt?: string; // ISO - when last completed (for recurring)
  relatedLogId?: string; // ID of the log created when completing this task
  priority?: 'high' | 'medium' | 'low'; // Default: 'medium'
  order?: number; // For sorting
  dueTime?: string; // "HH:mm"
  reminderMinutesBefore?: number; // e.g. 15
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  syncToReport?: boolean; // Whether to sync this task to the Learning Report schedule
  videoId?: string; // YouTube-Study integration: Related video ID
}

export interface Plan {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category?: string; 
  status: 'planned' | 'completed';
}

export interface PlanTemplate {
  id: string;
  name: string;
  items: Omit<Plan, 'id' | 'date' | 'status'>[];
}
