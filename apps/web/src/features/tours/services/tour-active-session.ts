import type { TourMode, TourStatus } from '../types';

const STORAGE_KEY = 'yuletide-tour-active-session';

export type TourActiveSession = {
  tourId: string;
  mode: TourMode;
  stepIndex: number;
  status: TourStatus;
};

export const TourActiveSessionStore = {
  save(session: TourActiveSession | null): void {
    try {
      if (!session || session.status === 'idle' || session.status === 'missing-target') {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* ignore private mode */
    }
  },

  load(): TourActiveSession | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as TourActiveSession;
    } catch {
      return null;
    }
  },

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};
