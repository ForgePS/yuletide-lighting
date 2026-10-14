'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface HelpToursContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const HelpToursContext = createContext<HelpToursContextValue | null>(null);

export function HelpToursProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const value = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return <HelpToursContext.Provider value={value}>{children}</HelpToursContext.Provider>;
}

export function useHelpTours(): HelpToursContextValue {
  const ctx = useContext(HelpToursContext);
  if (!ctx) {
    throw new Error('useHelpTours must be used within HelpToursProvider');
  }
  return ctx;
}
