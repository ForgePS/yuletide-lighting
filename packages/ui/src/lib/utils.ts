import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

/** Coerce Date / ISO string / epoch ms / Firestore-like {seconds|_seconds} into a valid Date. */
export function toValidDate(date: unknown): Date | null {
  if (date == null || date === '') return null;
  if (date instanceof Date) {
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof date === 'number' && Number.isFinite(date)) {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === 'string') {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof date === 'object') {
    const o = date as { toDate?: () => Date; seconds?: number; _seconds?: number; nanoseconds?: number; _nanoseconds?: number };
    if (typeof o.toDate === 'function') {
      try {
        const d = o.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
      } catch {
        return null;
      }
    }
    const seconds = typeof o.seconds === 'number' ? o.seconds : typeof o._seconds === 'number' ? o._seconds : null;
    if (seconds != null) {
      const nanos = typeof o.nanoseconds === 'number' ? o.nanoseconds : typeof o._nanoseconds === 'number' ? o._nanoseconds : 0;
      const d = new Date(seconds * 1000 + Math.floor(nanos / 1e6));
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

export function formatDate(date: Date | string | null | undefined): string {
  const d = toValidDate(date);
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function formatStage(stage: string): string {
  return stage
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
