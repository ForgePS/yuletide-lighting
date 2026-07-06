'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { SignCityBreakdown, SignLocationListItem, SignTrackerDashboard } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { SignTrackerFiltersBar, type SignTrackerFilters } from './sign-tracker-filters';
import { SignLocationDetail } from './sign-location-detail';
import {
  currentSeasonYear,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  PLACEMENT_TYPE_LABELS,
} from '@/lib/sign-tracker-utils';

const SignTrackerMap = dynamic(
  () => import('./sign-tracker-map').then((m) => m.SignTrackerMap),
  { ssr: false, loading: () => <LoadingState message="Loading map..." /> },
);

function DashboardCards({ dashboard }: { dashboard: SignTrackerDashboard }) {
  const cards = [
    { label: 'Total Signs Placed', value: dashboard.totalPlaced.toLocaleString() },
    { label: 'Active Signs', value: dashboard.activeSigns.toLocaleString() },
    { label: 'Recovered Signs', value: dashboard.recoveredSigns.toLocaleString() },
    { label: 'Missing Signs', value: dashboard.missingSigns.toLocaleString() },
    { label: 'Loss %', value: `${dashboard.lossPercentage}%` },
    { label: 'Recovery Rate', value: `${dashboard.recoveryRate}%` },
    { label: 'Active Cities', value: String(dashboard.activeCities) },
  ];

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">{dashboard.seasonYear} Season</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="mt-1 text-lg font-semibold">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CityBreakdownList({
  cities,
  selectedCity,
  onSelectCity,
}: {
  cities: SignCityBreakdown[];
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void;
}) {
  if (!cities.length) {
    return <p className="text-sm text-muted-foreground">No sign locations yet for this season.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">City Performance</h3>
      {cities.map((c) => {
        const label = `${c.city} ${c.state}`.trim();
        const active = selectedCity?.toLowerCase() === c.city.toLowerCase();
        return (
          <button
            key={`${c.city}-${c.state}`}
            type="button"
            onClick={() => onSelectCity(active ? null : c.city)}
            className={`w-full rounded-xl border p-4 text-left transition-all ${active ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}
          >
            <p className="font-semibold">{label}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-5">
              <span>Placed: {c.placed}</span>
              <span>Active: {c.active}</span>
              <span>Recovered: {c.recovered}</span>
              <span>Missing: {c.missing}</span>
              <span>Locations: {c.locations}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function SignTrackerDashboard() {
  const { idToken, loading: authLoading } = useAuth();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<SignLocationListItem | null>(null);
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');
  const [showMap, setShowMap] = useState(false);
  const [filters, setFilters] = useState<SignTrackerFilters>({
    seasonYear: currentSeasonYear(),
    city: '',
    status: '',
    placementType: '',
    dateFrom: '',
    dateTo: '',
    crewUserId: '',
  });

  const queryFilters = {
    seasonYear: filters.seasonYear,
    city: filters.city || undefined,
    status: filters.status || undefined,
    placementType: filters.placementType || undefined,
    dateFrom: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
    dateTo: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
    crewUserId: filters.crewUserId || undefined,
  };

  const ready = !authLoading && !!idToken;
  const { data, isLoading, isError, error, refetch } = trpc.signTracker360.pageData.useQuery(queryFilters, {
    enabled: ready,
    staleTime: 30_000,
  });
  const utils = trpc.useUtils();

  const cityList = [...new Set((data?.locations ?? []).map((l) => l.location.city).filter(Boolean))];

  if (!ready || isLoading) {
    return <LoadingState message="Loading sign tracker..." />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load sign tracker"
        message={error.message.includes('UNAUTHORIZED') ? 'Please sign in again to continue.' : error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) return <LoadingState message="Loading sign tracker..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div />
        <div className="flex flex-wrap gap-2">
          <Link href="/app/marketing/sign-tracker/pickup" className="btn-secondary">Start Sign Pickup</Link>
          <Link href="/app/marketing/sign-tracker/add" className="btn-primary">+ Add Sign Location</Link>
        </div>
      </div>

      <DashboardCards dashboard={data.dashboard} />
      <SignTrackerFiltersBar filters={filters} cities={cityList} onChange={setFilters} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {showMap ? (
            <SignTrackerMap
              locations={data.locations}
              selectedCity={selectedCity}
              onSelectLocation={setSelectedLocation}
            />
          ) : (
            <button
              type="button"
              className="card flex h-[400px] w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              onClick={() => setShowMap(true)}
            >
              <span className="text-4xl">🗺️</span>
              <span className="font-medium">Load map</span>
              <span className="text-xs">Tap to show {data.locations.length} locations</span>
            </button>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-green-500" /> Active</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-yellow-500" /> Needs Pickup</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-blue-500" /> Picked Up</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-red-500" /> Missing / Removed</span>
          </div>
        </div>
        <CityBreakdownList
          cities={data.cities}
          selectedCity={selectedCity}
          onSelectCity={setSelectedCity}
        />
      </div>

      {data.locations.length > 0 && (
        <div className="card overflow-x-auto p-4">
          <h3 className="mb-3 font-semibold">All Locations</h3>
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Location</th>
                <th>City</th>
                <th>Qty</th>
                <th>Type</th>
                <th>Status</th>
                <th>Placed</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {data.locations.map((loc) => (
                <tr
                  key={loc.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setDetailMode('view');
                    setSelectedLocation(loc);
                  }}
                >
                  <td className="font-medium">{loc.location.address || '—'}</td>
                  <td>{loc.location.city}</td>
                  <td>{loc.signData.quantityPlaced}</td>
                  <td>{PLACEMENT_TYPE_LABELS[loc.placementType]}</td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE_CLASSES[loc.status]}`}>
                      {STATUS_LABELS[loc.status]}
                    </span>
                  </td>
                  <td>{new Date(loc.signData.placementDate).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDetailMode('edit');
                        setSelectedLocation(loc);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedLocation && (
        <SignLocationDetail
          location={selectedLocation}
          initialMode={detailMode}
          onClose={() => setSelectedLocation(null)}
          onUpdated={() => {
            utils.signTracker360.pageData.invalidate();
            setSelectedLocation(null);
          }}
        />
      )}
    </div>
  );
}
