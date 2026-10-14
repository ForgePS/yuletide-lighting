'use client';

import { createContext, useContext } from 'react';
import type {
  TourMode,
  TourStatus,
  TourTargetMissingPayload,
  YuletideTourDefinition,
} from '../types';

export interface TourContextValue {
  status: TourStatus;
  activeTour: YuletideTourDefinition | null;
  stepIndex: number;
  mode: TourMode | null;
  missingTarget: TourTargetMissingPayload | null;
  isTransitioning: boolean;
  startTour: (tourId: string, mode?: TourMode, startStepIndex?: number) => Promise<void>;
  stopTour: () => void;
  nextStep: () => Promise<void>;
  prevStep: () => Promise<void>;
  pauseTour: () => void;
  resumeTour: () => void;
  restartTour: () => Promise<void>;
  retryStep: () => Promise<void>;
  skipStep: () => Promise<void>;
}

export const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) {
    throw new Error('useTour must be used within TourProvider');
  }
  return ctx;
}
