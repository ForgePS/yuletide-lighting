import type { DemoEntryMode } from '@clcrm/types';
import type { TourMode } from '../types';
import { TourActiveSessionStore } from './tour-active-session';

export const DEMO_ENTRY_STORAGE_KEY = 'yuletide-demo-entry-intent';

export function setDemoEntryIntent(mode: DemoEntryMode): void {
  try {
    TourActiveSessionStore.clear();
    sessionStorage.setItem(
      DEMO_ENTRY_STORAGE_KEY,
      JSON.stringify({ mode, createdAt: new Date().toISOString() }),
    );
  } catch {
    /* ignore private mode */
  }
}

export function consumeDemoEntryIntent(): { mode: DemoEntryMode } | null {
  try {
    const raw = sessionStorage.getItem(DEMO_ENTRY_STORAGE_KEY);
    sessionStorage.removeItem(DEMO_ENTRY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { mode?: DemoEntryMode };
    if (!parsed.mode) return null;
    return { mode: parsed.mode };
  } catch {
    return null;
  }
}

export function mapDemoEntryToTourMode(mode: DemoEntryMode): TourMode | null {
  if (mode === 'watch') return 'autoplay';
  if (mode === 'guided') return 'guided';
  return null;
}
