import { Log } from '@/types/stacklog';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

export function calculateStreak(logs: Log[], referenceDate: Date = new Date()): number {
  if (logs.length === 0) return 0;

  // Sort logs by date descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const today = startOfDay(referenceDate);
  const newestLogDate = startOfDay(parseISO(sortedLogs[0].date));
  
  const diff = differenceInDays(today, newestLogDate);
  if (diff > 1) return 0; 

  let streak = 0;
  const uniqueDates = Array.from(new Set(sortedLogs.map(l => l.date))).sort().reverse();
  
  if (uniqueDates.length === 0) return 0;

  const latest = parseISO(uniqueDates[0]);
  if (differenceInDays(today, latest) > 1) return 0;

  let current = latest;
  streak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
     const prev = parseISO(uniqueDates[i]);
     if (differenceInDays(current, prev) === 1) {
         streak++;
         current = prev;
     } else {
         break;
     }
  }

  return streak;
};

export function calculateMaxStreak(logs: Log[]): number {
  if (logs.length === 0) return 0;

  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const uniqueDates = Array.from(new Set(sortedLogs.map(l => l.date))).sort().reverse();

  if (uniqueDates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;
  let prevDate = parseISO(uniqueDates[0]);

  for (let i = 1; i < uniqueDates.length; i++) {
     const currentDate = parseISO(uniqueDates[i]);
     const diff = differenceInDays(prevDate, currentDate);

     if (diff === 1) {
         currentStreak++;
     } else {
         if (currentStreak > maxStreak) {
             maxStreak = currentStreak;
         }
         currentStreak = 1;
     }
     prevDate = currentDate;
  }
  
  if (currentStreak > maxStreak) {
       maxStreak = currentStreak;
  }

  return maxStreak;
}

export const getLocalDateString = (d: Date = new Date()): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getTodaysTotalMinutes = (logs: Log[]): number => {
    const todayStr = getLocalDateString();
    return logs
        .filter(log => log.date === todayStr)
        .reduce((sum, log) => sum + log.minutes, 0);
};

export function calculateGoalAchievementDays(logs: Log[], dailyGoal: number): number {
    if (dailyGoal <= 0) return 0;

    const dailyTotals: Record<string, number> = {};
    logs.forEach(log => {
        dailyTotals[log.date] = (dailyTotals[log.date] || 0) + log.minutes;
    });

    return Object.values(dailyTotals).filter(minutes => minutes >= dailyGoal).length;
}

export function calculateGoalStreak(logs: Log[], dailyGoal: number): number {
    if (dailyGoal <= 0) return 0;
    
    const dailyTotals: Record<string, number> = {};
    logs.forEach(log => {
        dailyTotals[log.date] = (dailyTotals[log.date] || 0) + log.minutes;
    });

    const uniqueDates = Object.keys(dailyTotals).sort().reverse();
    if (uniqueDates.length === 0) return 0;

    const today = startOfDay(new Date());
    const goalMetDates = uniqueDates.filter(date => dailyTotals[date] >= dailyGoal);
    
    if (goalMetDates.length === 0) return 0;

    const latestGoalMet = parseISO(goalMetDates[0]);
    if (differenceInDays(today, latestGoalMet) > 1) return 0;

    let streak = 1;
    let current = latestGoalMet;

    for (let i = 1; i < goalMetDates.length; i++) {
         const prev = parseISO(goalMetDates[i]);
         if (differenceInDays(current, prev) === 1) {
             streak++;
             current = prev;
         } else {
             break;
         }
    }
    return streak;
}

export function calculateMaxGoalStreak(logs: Log[], dailyGoal: number): number {
    if (dailyGoal <= 0) return 0;

    const dailyTotals: Record<string, number> = {};
    logs.forEach(log => {
        dailyTotals[log.date] = (dailyTotals[log.date] || 0) + log.minutes;
    });

    const uniqueDates = Object.keys(dailyTotals).sort().reverse();
    const goalMetDates = uniqueDates.filter(date => dailyTotals[date] >= dailyGoal);

    if (goalMetDates.length === 0) return 0;

    let maxStreak = 1;
    let currentStreak = 1;
    let prevDate = parseISO(goalMetDates[0]);

    for (let i = 1; i < goalMetDates.length; i++) {
         const currentDate = parseISO(goalMetDates[i]);
         const diff = differenceInDays(prevDate, currentDate);

         if (diff === 1) {
             currentStreak++;
         } else {
             if (currentStreak > maxStreak) {
                 maxStreak = currentStreak;
             }
             currentStreak = 1;
         }
         prevDate = currentDate;
    }
    
    if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
    }

    return maxStreak;
}
