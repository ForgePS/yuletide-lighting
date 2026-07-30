'use client';

import { useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { SettingsLoading, SettingsSection } from './settings-widgets';

const STATUS_FILTERS = [
  'all',
  'active',
  'reusable',
  'used_for_activation',
  'expired',
  'revoked',
  'replaced',
  'suspended',
] as const;

export function PortalQrManagementPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>('all');
  const utils = trpc.useUtils();

  const { data: analytics, isLoading: analyticsLoading } = trpc.portal360.qrAnalytics.useQuery();
  const { data: codes, isLoading: listLoading } = trpc.portal360.qrOrgList.useQuery({
    status,
    limit: 100,
  });

  const revoke = trpc.portal360.qrRevoke.useMutation({
    onSuccess: () => {
      toast('QR revoked', 'success');
      void utils.portal360.qrOrgList.invalidate();
      void utils.portal360.qrAnalytics.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (analyticsLoading && !analytics) return <SettingsLoading message="Loading portal QR analytics…" />;

  const kpis = [
    { label: 'Generated', value: analytics?.generated ?? 0 },
    { label: 'Active', value: analytics?.active ?? 0 },
    { label: 'Expired', value: analytics?.expired ?? 0 },
    { label: 'Revoked / replaced', value: analytics?.revoked ?? 0 },
    { label: 'Total scans', value: analytics?.totalScans ?? 0 },
    { label: 'Activations', value: analytics?.activations ?? 0 },
    { label: 'Not activated', value: analytics?.notActivated ?? 0 },
    { label: 'Failed verifications', value: analytics?.failedVerifications ?? 0 },
  ];

  const devices = Object.entries(analytics?.byDevice ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Portal QR</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Org-wide QR codes, scan analytics, and print workflows. Tokens are hashed at rest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/app/customers/portal-qr" className="btn-secondary text-sm">Bulk generate</Link>
          <Link href="/app/settings/customer-portal" className="btn-ghost text-sm">Portal settings</Link>
        </div>
      </div>

      <SettingsSection title="Analytics">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-xl border border-border px-3 py-3">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{k.value}</p>
            </div>
          ))}
        </div>
        {devices.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium">Scans by device</p>
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">
              {devices.map(([device, count]) => (
                <li key={device} className="rounded-lg border border-border px-2 py-1 capitalize">
                  {device}: <span className="font-semibold tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Recent scans" description="Latest org-wide scan events.">
        {(analytics?.recentScans?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">When</th>
                  <th className="px-2 py-1.5 font-medium">Customer</th>
                  <th className="px-2 py-1.5 font-medium">Result</th>
                  <th className="px-2 py-1.5 font-medium">Device</th>
                  <th className="px-2 py-1.5 font-medium">Ref</th>
                </tr>
              </thead>
              <tbody>
                {analytics!.recentScans.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {s.scannedAt ? new Date(s.scannedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      <Link href={`/app/customers/${s.customerId}`} className="text-primary hover:underline">
                        {s.customerId.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 capitalize">
                      {s.validationResult.replace(/_/g, ' ')}
                      {s.authenticationResult ? ` / ${s.authenticationResult.replace(/_/g, ' ')}` : ''}
                    </td>
                    <td className="px-2 py-1.5 capitalize">{s.deviceClass ?? '—'}</td>
                    <td className="px-2 py-1.5 font-mono text-[10px]">{s.diagnosticReference ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="QR codes" description="Filter and revoke codes across customers.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="text-sm">
            <span className="sr-only">Status</span>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
          {listLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
        {(codes?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No QR codes match this filter.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Customer</th>
                  <th className="px-2 py-1.5 font-medium">Type</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                  <th className="px-2 py-1.5 font-medium">Scans</th>
                  <th className="px-2 py-1.5 font-medium">Last scan</th>
                  <th className="px-2 py-1.5 font-medium">Expires</th>
                  <th className="px-2 py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {codes!.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-2 py-1.5">
                      <Link href={`/app/customers/${c.customerId}`} className="text-primary hover:underline">
                        {c.customerName}
                      </Link>
                      {c.label ? <span className="block text-muted-foreground">{c.label}</span> : null}
                    </td>
                    <td className="px-2 py-1.5 capitalize">{c.type.replace(/_/g, ' ')}</td>
                    <td className="px-2 py-1.5 capitalize">
                      {c.status.replace(/_/g, ' ')}
                      {c.expired ? ' · expired' : ''}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {c.scanCount}
                      {c.failedVerificationCount ? ` / ${c.failedVerificationCount} fail` : ''}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {c.lastScannedAt ? new Date(c.lastScannedAt).toLocaleString() : '—'}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {c.status !== 'revoked' && c.status !== 'replaced' && (
                        <button
                          type="button"
                          className="text-red-600 hover:underline"
                          disabled={revoke.isPending}
                          onClick={() => revoke.mutate({ qrCodeId: c.id })}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsSection>

      <SettingsSection title="Printing notes">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Generate from a customer record to capture the one-time secure download URL.</li>
          <li>Bulk tools: Avery 5160/5163 sheets, postcards with {'{{customerPortalQrCode}}'} placement modes, ZIP of PNG/SVG.</li>
          <li>Open <Link href="/app/customers/portal-qr" className="text-primary hover:underline">Customers → Bulk portal QR</Link> for filtered batch jobs.</li>
        </ul>
      </SettingsSection>
    </div>
  );
}
