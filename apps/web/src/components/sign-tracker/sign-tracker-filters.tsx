'use client';

import type { SignLocationStatus, SignPlacementType } from '@clcrm/types';
import { PLACEMENT_TYPE_LABELS, SEASON_OPTIONS, STATUS_LABELS } from '@/lib/sign-tracker-utils';

export type SignTrackerFilters = {
  seasonYear: number;
  city: string;
  status: SignLocationStatus | '';
  placementType: SignPlacementType | '';
  dateFrom: string;
  dateTo: string;
  crewUserId: string;
};

type SignTrackerFiltersBarProps = {
  filters: SignTrackerFilters;
  cities: string[];
  onChange: (filters: SignTrackerFilters) => void;
};

export function SignTrackerFiltersBar({ filters, cities, onChange }: SignTrackerFiltersBarProps) {
  function update<K extends keyof SignTrackerFilters>(key: K, value: SignTrackerFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <label className="text-sm">
        <span className="text-muted-foreground">Season</span>
        <select className="input mt-1 w-full" value={filters.seasonYear} onChange={(e) => update('seasonYear', Number(e.target.value))}>
          {SEASON_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="text-muted-foreground">City</span>
        <select className="input mt-1 w-full" value={filters.city} onChange={(e) => update('city', e.target.value)}>
          <option value="">All cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="text-muted-foreground">Status</span>
        <select className="input mt-1 w-full" value={filters.status} onChange={(e) => update('status', e.target.value as SignLocationStatus | '')}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABELS) as SignLocationStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="text-muted-foreground">Placement type</span>
        <select className="input mt-1 w-full" value={filters.placementType} onChange={(e) => update('placementType', e.target.value as SignPlacementType | '')}>
          <option value="">All types</option>
          {(Object.keys(PLACEMENT_TYPE_LABELS) as SignPlacementType[]).map((t) => (
            <option key={t} value={t}>{PLACEMENT_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="text-muted-foreground">From</span>
        <input type="date" className="input mt-1 w-full" value={filters.dateFrom} onChange={(e) => update('dateFrom', e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="text-muted-foreground">To</span>
        <input type="date" className="input mt-1 w-full" value={filters.dateTo} onChange={(e) => update('dateTo', e.target.value)} />
      </label>
      <label className="text-sm">
        <span className="text-muted-foreground">Crew member ID</span>
        <input className="input mt-1 w-full" placeholder="User ID" value={filters.crewUserId} onChange={(e) => update('crewUserId', e.target.value)} />
      </label>
    </div>
  );
}
