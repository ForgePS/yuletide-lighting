'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCurrency } from '@clcrm/ui';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { hasPermission } from '@clcrm/types';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { currentSeasonYear, SEASON_OPTIONS, STATUS_COLORS } from '@/lib/sign-tracker-utils';
import { TerritoryIntelligence } from './territory-intelligence';
import { MapUnavailable, useMapboxTokenReady } from '@/components/maps/map-unavailable';
import dynamic from 'next/dynamic';

const SignTrackerMap = dynamic(
  () => import('./sign-tracker-map').then((m) => m.SignTrackerMap),
  { ssr: false, loading: () => <MapUnavailable message="Loading map…" /> },
);

export function SignCampaignReport() {
  const { idToken, loading: authLoading } = useAuth();
  const [seasonYear, setSeasonYear] = useState(currentSeasonYear());
  const [city, setCity] = useState('');
  const [status, setStatus] = useState('');
  const [costInput, setCostInput] = useState('');
  const ready = !authLoading && !!idToken;
  const { data: myPermissions } = trpc.settings360.myPermissions.useQuery(undefined, { enabled: ready });
  const canExport = myPermissions ? hasPermission(myPermissions, 'sign_tracker', 'export') : false;
  const canManage = myPermissions ? hasPermission(myPermissions, 'sign_tracker', 'manage') : false;
  const { available: mapAvailable } = useMapboxTokenReady();

  const { data: report, isLoading, isError, error, refetch } = trpc.signTracker360.report.useQuery(
    { seasonYear },
    { enabled: ready },
  );
  const { data: locations, isLoading: locationsLoading } = trpc.signTracker360.list.useQuery(
    {
      seasonYear,
      city: city || undefined,
      status: (status || undefined) as
        | 'active'
        | 'needs_pickup'
        | 'picked_up'
        | 'partially_recovered'
        | 'missing'
        | 'removed'
        | undefined,
    },
    { enabled: ready },
  );
  const { data: settings } = trpc.signTracker360.settings.get.useQuery(undefined, {
    enabled: ready && canManage,
  });
  const utils = trpc.useUtils();
  const updateSettings = trpc.signTracker360.settings.update.useMutation({
    onSuccess: () => utils.signTracker360.report.invalidate(),
  });

  const filtered = useMemo(() => locations ?? [], [locations]);

  const statusCounts = useMemo(() => {
    const counts = {
      active: 0,
      needs_pickup: 0,
      picked_up: 0,
      partially_recovered: 0,
      missing: 0,
      removed: 0,
      total: 0,
    };
    for (const row of filtered) {
      counts.total += 1;
      const key = row.status as keyof typeof counts;
      if (key in counts && key !== 'total') counts[key] += 1;
    }
    return counts;
  }, [filtered]);

  if (!ready || isLoading || locationsLoading) return <LoadingState message="Loading campaign report..." />;

  if (isError) {
    return (
      <ErrorState
        title="Could not load campaign report"
        message={error.message.includes('UNAUTHORIZED') || error.message.includes('MODULE_NOT_ENABLED') || error.message.includes('Missing permission')
          ? error.message
          : error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!report) {
    return <EmptyState title="No report data" description="No sign activity for this season yet." />;
  }

  function saveCost() {
    const cents = Math.round(parseFloat(costInput) * 100);
    if (!isNaN(cents)) {
      updateSettings.mutate({ costPerSignCents: cents }, {
        onSuccess: () => utils.signTracker360.report.invalidate(),
      });
    }
  }

  function exportCsv() {
    if (!canExport || !filtered.length) return;
    const header = ['id', 'city', 'state', 'status', 'quantity', 'address'];
    const rows = filtered.map((l) => [
      l.id,
      l.location.city,
      l.location.state,
      l.status,
      String(l.signData.quantityPlaced),
      `"${(l.location.address || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sign-report-${seasonYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cities = [...new Set((locations ?? []).map((l) => l.location.city).filter(Boolean))].sort();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground">Season</span>
          <select className="input ml-2" value={seasonYear} onChange={(e) => setSeasonYear(Number(e.target.value))}>
            {SEASON_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">City / territory</span>
          <select className="input ml-2" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-muted-foreground">Status</span>
          <select className="input ml-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="needs_pickup">Needs pickup</option>
            <option value="picked_up">Picked up</option>
            <option value="partially_recovered">Partially recovered</option>
            <option value="missing">Missing</option>
            <option value="removed">Removed</option>
          </select>
        </label>
        {canExport ? (
          <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Total signs (filtered)</p>
          <p className="mt-1 text-lg font-semibold">{statusCounts.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="mt-1 text-lg font-semibold">{statusCounts.active}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Needs pickup</p>
          <p className="mt-1 text-lg font-semibold">{statusCounts.needs_pickup}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Picked up</p>
          <p className="mt-1 text-lg font-semibold">{statusCounts.picked_up}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Partially recovered</p>
          <p className="mt-1 text-lg font-semibold">{statusCounts.partially_recovered}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Missing</p>
          <p className="mt-1 text-lg font-semibold">{statusCounts.missing}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Season recovery %</p>
          <p className="mt-1 text-lg font-semibold">{report.recoveryPercentage}%</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted-foreground">Replacement cost</p>
          <p className="mt-1 text-lg font-semibold">{formatCurrency(report.replacementCostCents)}</p>
        </div>
      </div>

      {mapAvailable ? (
        <div className="overflow-hidden rounded-xl border">
          <SignTrackerMap locations={filtered} selectedCity={city || null} />
        </div>
      ) : (
        <MapUnavailable />
      )}

      <div className="card overflow-x-auto p-4">
        <h3 className="mb-3 font-semibold">Matching sign records</h3>
        {!filtered.length ? (
          <EmptyState title="No signs match" description="Adjust season, city, or status filters." />
        ) : (
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Address</th>
                <th>City</th>
                <th>Status</th>
                <th>Qty</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.location.address || '—'}</td>
                  <td>
                    {row.location.city}, {row.location.state}
                  </td>
                  <td>
                    <span
                      className="inline-block rounded px-2 py-0.5 text-xs capitalize text-white"
                      style={{ backgroundColor: STATUS_COLORS[row.status] ?? '#6b7280' }}
                    >
                      {row.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{row.signData.quantityPlaced}</td>
                  <td>
                    <Link
                      className="text-primary hover:underline"
                      href={`/app/marketing/sign-tracker?locationId=${encodeURIComponent(row.id)}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {canManage ? (
        <div className="card p-6">
          <h3 className="font-semibold">Cost estimate</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.totalMissing} missing signs × {formatCurrency(report.costPerSignCents)}/sign ={' '}
            {formatCurrency(report.replacementCostCents)} replacement cost
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="text-muted-foreground">Cost per sign ($)</span>
              <input
                type="number"
                step="0.01"
                className="input mt-1 w-32"
                placeholder={(settings?.costPerSignCents ?? 600) / 100 + ''}
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
              />
            </label>
            <button type="button" className="btn-primary" disabled={updateSettings.isPending} onClick={saveCost}>
              Save
            </button>
          </div>
        </div>
      ) : null}

      <div className="card overflow-x-auto p-4">
        <h3 className="mb-3 font-semibold">Signs placed by city</h3>
        <table className="data-table w-full text-sm">
          <thead>
            <tr>
              <th>City</th>
              <th>Placed</th>
              <th>Recovered</th>
              <th>Missing</th>
              <th>Recovery %</th>
              <th>Loss %</th>
            </tr>
          </thead>
          <tbody>
            {report.byCity.map((c) => (
              <tr key={`${c.city}-${c.state}`}>
                <td className="font-medium">
                  {c.city}, {c.state}
                </td>
                <td>{c.placed}</td>
                <td>{c.recovered}</td>
                <td>{c.missing}</td>
                <td>{c.placed ? Math.round((c.recovered / c.placed) * 100) : 0}%</td>
                <td>{c.placed ? Math.round((c.missing / c.placed) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TerritoryIntelligence seasonYear={seasonYear} />
    </div>
  );
}
