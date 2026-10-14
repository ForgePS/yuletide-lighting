import type { TourProgressRecord } from '@clcrm/types';
import { canResumeTourProgress, resumeStepIndex } from '@clcrm/types';

export { canResumeTourProgress, resumeStepIndex };

const STORAGE_PREFIX = 'yuletide-tour-progress:';

function storageKey(tourId: string) {
  return `${STORAGE_PREFIX}${tourId}`;
}

export const TourPersistenceService = {
  save(record: TourProgressRecord): void {
    try {
      localStorage.setItem(storageKey(record.tourId), JSON.stringify(record));
    } catch {
      /* ignore quota / private mode */
    }
  },

  load(tourId: string): TourProgressRecord | null {
    try {
      const raw = localStorage.getItem(storageKey(tourId));
      if (!raw) return null;
      return JSON.parse(raw) as TourProgressRecord;
    } catch {
      return null;
    }
  },

  loadAll(): TourProgressRecord[] {
    const records: TourProgressRecord[] = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key?.startsWith(STORAGE_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        records.push(JSON.parse(raw) as TourProgressRecord);
      }
    } catch {
      return records;
    }
    return records;
  },

  remove(tourId: string): void {
    try {
      localStorage.removeItem(storageKey(tourId));
    } catch {
      /* ignore */
    }
  },

  hydrateFromServer(records: TourProgressRecord[]): void {
    for (const record of records) {
      this.save(record);
    }
  },
};
