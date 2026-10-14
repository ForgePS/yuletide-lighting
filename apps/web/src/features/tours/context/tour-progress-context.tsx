'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import type { TourProgressRecord } from '@clcrm/types';
import type { TourMode } from '../types';
import { trpc } from '@/lib/trpc';
import { TourPersistenceService } from '../services/tour-persistence';

export type TourProgressMap = Record<string, TourProgressRecord>;

export interface TourProgressContextValue {
  progressByTourId: TourProgressMap;
  isLoading: boolean;
  saveProgress: (input: {
    tourId: string;
    tourVersion: number;
    status: TourProgressRecord['status'];
    currentStep: number;
    mode: TourMode;
  }) => void;
  dismissProgress: (tourId: string) => void;
  refetch: () => void;
}

const TourProgressContext = createContext<TourProgressContextValue | null>(null);

export function TourProgressProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.tours360.list.useQuery(undefined, {
    staleTime: 30_000,
    retry: 1,
  });

  const saveMutation = trpc.tours360.save.useMutation({
    onSuccess: (record) => {
      TourPersistenceService.save(record);
      void utils.tours360.list.invalidate();
    },
  });

  const dismissMutation = trpc.tours360.dismiss.useMutation({
    onSuccess: (record) => {
      if (record) TourPersistenceService.save(record);
      void utils.tours360.list.invalidate();
    },
  });

  const progressByTourId = useMemo<TourProgressMap>(() => {
    const map: TourProgressMap = {};
    for (const record of data ?? []) {
      map[record.tourId] = record;
      TourPersistenceService.save(record);
    }
    return map;
  }, [data]);

  const saveProgress = useCallback(
    (input: {
      tourId: string;
      tourVersion: number;
      status: TourProgressRecord['status'];
      currentStep: number;
      mode: TourMode;
    }) => {
      const optimistic: TourProgressRecord = {
        ...input,
        startedAt: progressByTourId[input.tourId]?.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: input.status === 'completed' ? new Date().toISOString() : null,
        dismissedAt: input.status === 'dismissed' ? new Date().toISOString() : null,
      };
      TourPersistenceService.save(optimistic);
      saveMutation.mutate(input);
    },
    [progressByTourId, saveMutation],
  );

  const dismissProgress = useCallback(
    (tourId: string) => {
      dismissMutation.mutate({ tourId });
    },
    [dismissMutation],
  );

  const value = useMemo(
    () => ({
      progressByTourId,
      isLoading,
      saveProgress,
      dismissProgress,
      refetch: () => void refetch(),
    }),
    [progressByTourId, isLoading, saveProgress, dismissProgress, refetch],
  );

  return <TourProgressContext.Provider value={value}>{children}</TourProgressContext.Provider>;
}

export function useTourProgress(): TourProgressContextValue {
  const ctx = useContext(TourProgressContext);
  if (!ctx) {
    throw new Error('useTourProgress must be used within TourProgressProvider');
  }
  return ctx;
}
