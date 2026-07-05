'use client';

import { useState } from 'react';
import { formatCurrency } from '@clcrm/ui';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { currentSeasonYear, SEASON_OPTIONS } from '@/lib/sign-tracker-utils';
import { TerritoryIntelligence } from './territory-intelligence';

export function SignCampaignReport() {
  const { idToken, loading: authLoading } = useAuth();
  const [seasonYear, setSeasonYear] = useState(currentSeasonYear());
  const [costInput, setCostInput] = useState('');
  const ready = !authLoading && !!idToken;

  const { data: report, isLoading, isError, error, refetch } = trpc.signTracker360.report.useQuery(
    { seasonYear },
    { enabled: ready },
  );
  const { data: settings } = trpc.signTracker360.settings.get.useQuery(undefined, { enabled: ready });
  const utils = trpc.useUtils();
  const updateSettings = trpc.signTracker360.settings.update.useMutation({
    onSuccess: () => utils.signTracker360.report.invalidate(),
  });

  if (!ready || isLoading || !report) return <LoadingState message="Loading campaign report..." />;

  if (isError) {
    return (
      <ErrorState
        title="Could not load campaign report"
        message={error.message.includes('UNAUTHORIZED') ? 'Please sign in again to continue.' : error.message}
        onRetry={() => refetch()}
      />
    );
  }

  function saveCost() {
    const cents = Math.round(parseFloat(costInput) * 100);
    if (!isNaN(cents)) {
      updateSettings.mutate({ costPerSignCents: cents }, {
        onSuccess: () => utils.signTracker360.report.invalidate(),
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="text-muted-foreground">Season</span>
          <select className="input ml-2" value={seasonYear} onChange={(e) => setSeasonYear(Number(e.target.value))}>
            {SEASON_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-muted-foreground">Total placed</p><p className="mt-1 text-lg font-semibold">{report.totalPlaced}</p></div>
        <div className="card p-4"><p className="text-xs text-muted-foreground">Recovery %</p><p className="mt-1 text-lg font-semibold">{report.recoveryPercentage}%</p></div>
        <div className="card p-4"><p className="text-xs text-muted-foreground">Loss %</p><p className="mt-1 text-lg font-semibold">{report.lossPercentage}%</p></div>
        <div className="card p-4"><p className="text-xs text-muted-foreground">Replacement cost</p><p className="mt-1 text-lg font-semibold">{formatCurrency(report.replacementCostCents)}</p></div>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold">Cost estimate</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {report.totalMissing} missing signs × {formatCurrency(report.costPerSignCents)}/sign = {formatCurrency(report.replacementCostCents)} replacement cost
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
          <button type="button" className="btn-primary" disabled={updateSettings.isPending} onClick={saveCost}>Save</button>
        </div>
      </div>

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
                <td className="font-medium">{c.city}, {c.state}</td>
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
