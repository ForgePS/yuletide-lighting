import { driver, type Config, type Driver } from 'driver.js';
import type { TourPlacement } from '../types';

type DriverWithRefresh = Driver & { refresh?: () => void };

export function mapTourPlacement(placement?: TourPlacement): 'top' | 'right' | 'bottom' | 'left' {
  if (!placement || placement === 'center') return 'bottom';
  return placement;
}

export function refreshTourDriver(instance: Driver | null): void {
  if (!instance) return;
  (instance as DriverWithRefresh).refresh?.();
}

export function createTourDriver(overrides: Partial<Config> = {}): Driver {
  return driver({
    animate: false,
    allowClose: false,
    showButtons: [],
    showProgress: false,
    overlayOpacity: 0.55,
    stagePadding: 10,
    stageRadius: 10,
    popoverClass: 'yuletide-tour-popover',
    allowKeyboardControl: false,
    smoothScroll: false,
    allowScroll: true,
    ...overrides,
  });
}

export function destroyTourDriver(instance: Driver | null): void {
  if (!instance) return;
  try {
    instance.destroy();
  } catch {
    /* ignore teardown errors */
  }
}
