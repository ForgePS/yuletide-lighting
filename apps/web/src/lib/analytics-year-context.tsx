'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type AnalyticsYearContextValue = {
  year: number | null;
  setYear: (year: number | null) => void;
  filterInput: { year?: number };
  yearLabel: string;
};

const AnalyticsYearContext = createContext<AnalyticsYearContextValue | null>(null);

const YEAR_OPTIONS = (() => {
  const current = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => current - i);
})();

export function AnalyticsYearProvider({ children }: { children: React.ReactNode }) {
  const [year, setYear] = useState<number | null>(null);
  const filterInput = useMemo(() => (year == null ? {} : { year }), [year]);
  const yearLabel = year == null ? 'All time' : String(year);

  return (
    <AnalyticsYearContext.Provider value={{ year, setYear, filterInput, yearLabel }}>
      {children}
    </AnalyticsYearContext.Provider>
  );
}

export function useAnalyticsYear() {
  const ctx = useContext(AnalyticsYearContext);
  if (!ctx) {
    return {
      year: null,
      setYear: () => {},
      filterInput: {},
      yearLabel: 'All time',
    };
  }
  return ctx;
}

export function AnalyticsYearFilter({ className }: { className?: string }) {
  const { year, setYear } = useAnalyticsYear();

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <label htmlFor="analytics-year" className="text-sm text-muted-foreground">Year</label>
      <select
        id="analytics-year"
        className="input w-auto min-w-[7rem]"
        value={year ?? ''}
        onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">All time</option>
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
}

export function AnalyticsYearBadge() {
  const { yearLabel } = useAnalyticsYear();
  return (
    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {yearLabel}
    </span>
  );
}
