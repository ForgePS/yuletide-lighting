import type { TourAnalyticsEvent } from '../types';

type AnalyticsListener = (event: TourAnalyticsEvent) => void;

const listeners = new Set<AnalyticsListener>();

export const TourAnalyticsService = {
  track(event: TourAnalyticsEvent): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('yuletide-tour-analytics', { detail: event }));
    }
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        /* listener errors must not break tours */
      }
    }
    if (process.env.NODE_ENV === 'development') {
      console.debug('[tour-analytics]', event);
    }
  },

  subscribe(listener: AnalyticsListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
