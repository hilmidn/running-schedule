import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'running-schedule-progress';

type ProgressMap = Record<string, boolean>; // key: "week-day" e.g. "1-Senin"

const SEED_DATA: ProgressMap = {
  '1-Senin': true,
  '1-Selasa': true,
  '1-Rabu': true,
};

export function useProgress() {
  const [progress, setProgress] = useState<ProgressMap>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // First visit — seed with chat data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return { ...SEED_DATA };
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  const toggle = useCallback((week: number, day: string) => {
    const key = `${week}-${day}`;
    setProgress(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const isDone = useCallback((week: number, day: string): boolean => {
    return !!progress[`${week}-${day}`];
  }, [progress]);

  const weekProgress = useCallback((week: number, days: string[]): { done: number; total: number } => {
    const done = days.filter(d => progress[`${week}-${d}`]).length;
    return { done, total: days.length };
  }, [progress]);

  const overallProgress = useCallback((totalDays: number): { done: number; total: number } => {
    const done = Object.values(progress).filter(Boolean).length;
    return { done, total: totalDays };
  }, [progress]);

  const streak = useCallback((dayOrder: string[]): number => {
    // dayOrder: ordered list of "week-day" keys from start to today
    let count = 0;
    for (let i = dayOrder.length - 1; i >= 0; i--) {
      if (progress[dayOrder[i]]) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [progress]);

  const phaseProgress = useCallback((weekRange: [number, number], allDays: Record<number, string[]>): { done: number; total: number } => {
    let done = 0;
    let total = 0;
    for (let w = weekRange[0]; w <= weekRange[1]; w++) {
      const days = allDays[w] || [];
      total += days.length;
      done += days.filter(d => progress[`${w}-${d}`]).length;
    }
    return { done, total };
  }, [progress]);

  return { toggle, isDone, weekProgress, overallProgress, streak, phaseProgress };
}
