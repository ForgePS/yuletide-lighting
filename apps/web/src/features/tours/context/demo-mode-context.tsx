'use client';

import { createContext, useContext, useMemo } from 'react';
import { trpc } from '@/lib/trpc';

export interface DemoModeContextValue {
  isDemoMode: boolean;
  isDemoTenant: boolean;
  companyName: string | null;
  isLoading: boolean;
}

const defaultValue: DemoModeContextValue = {
  isDemoMode: false,
  isDemoTenant: false,
  companyName: null,
  isLoading: true,
};

export const DemoModeContext = createContext<DemoModeContextValue>(defaultValue);

export function useDemoMode(): DemoModeContextValue {
  return useContext(DemoModeContext);
}

/** Resolves demo tenant state from the server (organization record). */
export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = trpc.demo360.context.useQuery(undefined, {
    staleTime: 60_000,
    retry: 1,
  });

  const value = useMemo<DemoModeContextValue>(
    () => ({
      isDemoTenant: data?.isDemoTenant ?? false,
      isDemoMode: data?.isDemoMode ?? false,
      companyName: data?.companyName ?? null,
      isLoading,
    }),
    [data, isLoading],
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}
