'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import {
  PRINT_TEMPLATE_OPTIONS,
  STICKER_SIZES_IN,
  downloadDataUrl,
  downloadTextFile,
  printQrSheet,
  qrToPngDataUrl,
  qrToSvgString,
  type PrintTemplateKind,
} from '@/lib/portal-qr';
import { PortalQrGeneratorModal } from './portal-qr-generator-modal';

export function CustomerPortalQrCard({ customerId }: { customerId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading, refetch } = trpc.portal360.qrList.useQuery({ customerId });
  const { data: accountView } = trpc.portal360.getAccount.useQuery({ customerId });
  const { data: scans } = trpc.portal360.qrScans.useQuery(
    { qrCodeId: data?.active?.id ?? '', limit: 20 },
    { enabled: Boolean(data?.active?.id) },
  );

  const [secureUrl, setSecureUrl] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [printTemplate, setPrintTemplate] = useState<PrintTemplateKind>('sticker');
  const [stickerInches, setStickerInches] = useState(2);

  useEffect(() => {
    const cached = sessionStorage.getItem(`portal-qr-url:${customerId}`);
    if (cached) setSecureUrl(cached);
  }, [customerId]);

  function rememberUrl(url: string) {
    setSecureUrl(url);
    sessionStorage.setItem(`portal-qr-url:${customerId}`, url);
  }

  const revoke = trpc.portal360.qrRevoke.useMutation({
    onSuccess: () => {
      setSecureUrl(null);
      sessionStorage.removeItem(`portal-qr-url:${customerId}`);
      toast('QR code revoked', 'success');
      refetch();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const replace = trpc.portal360.qrReplace.useMutation({
    onSuccess: (result) => {
      rememberUrl(result.accessUrl);
      toast('QR replaced — download the new secure link', 'success');
      refetch();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const active = data?.active;
  const codes = data?.codes ?? [];

  async function withUrl(action: (url: string) => Promise<void>) {
    if (!secureUrl) {
      toast('Generate or replace a QR first to get a downloadable secure link', 'error');
      return;
    }
    setBusyId(active?.id ?? 'qr');
    try {
      await action(secureUrl);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Portal Access</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            QR URLs use cryptographically random tokens (hashed at rest). Scanning starts identity verification — it does not permanently log the customer in.
          </p>
        </div>
        <Link href="/app/settings/portal-qr" className="text-xs text-primary hover:underline">
          Org QR hub →
        </Link>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">Portal status</dt>
          <dd className="font-medium capitalize">{accountView?.status ?? data?.account?.status ?? 'not invited'}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">Customer email</dt>
          <dd className="font-medium">{data?.customerEmail ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">Customer phone</dt>
          <dd className="font-medium">{data?.customerPhone ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">Last portal login</dt>
          <dd className="font-medium">
            {accountView?.lastLoginAt ? new Date(accountView.lastLoginAt).toLocaleString() : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">QR status</dt>
          <dd className="font-medium capitalize">{active?.status?.replace(/_/g, ' ') ?? 'none'}</dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">Scans / failed verifications</dt>
          <dd className="font-medium">
            {active?.scanCount ?? 0} / {active?.failedVerificationCount ?? 0}
          </dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">Last QR scan</dt>
          <dd className="font-medium">
            {active?.lastScannedAt ? new Date(active.lastScannedAt).toLocaleString() : '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2 sm:block">
          <dt className="text-muted-foreground">Activation</dt>
          <dd className="font-medium">
            {active?.activatedAt ? new Date(active.activatedAt).toLocaleString() : 'Not activated'}
          </dd>
        </div>
      </dl>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading QR codes…</p>
      ) : (
        <>
          {secureUrl && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
              Secure link (session only — copy/download now):
              <p className="mt-1 break-all font-mono">{secureUrl}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary text-sm" onClick={() => setModalOpen(true)}>
              {active ? 'Generate / replace QR' : 'Generate QR'}
            </button>
            {active && (
              <>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  disabled={replace.isPending}
                  onClick={() => replace.mutate({ qrCodeId: active.id, label: active.label })}
                >
                  Quick replace
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs text-red-600"
                  disabled={revoke.isPending}
                  onClick={() => revoke.mutate({ qrCodeId: active.id })}
                >
                  Revoke
                </button>
              </>
            )}
          </div>

          {active && (
            <div className="space-y-3 rounded-xl border border-border p-3">
              <p className="text-sm font-medium">Print &amp; download</p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="block text-xs">
                  <span className="font-medium text-muted-foreground">Template</span>
                  <select
                    className="input mt-1"
                    value={printTemplate}
                    onChange={(e) => setPrintTemplate(e.target.value as PrintTemplateKind)}
                  >
                    {PRINT_TEMPLATE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="font-medium text-muted-foreground">Size</span>
                  <select
                    className="input mt-1"
                    value={stickerInches}
                    onChange={(e) => setStickerInches(Number(e.target.value))}
                  >
                    {STICKER_SIZES_IN.map((s) => (
                      <option key={s.inches} value={s.inches}>{s.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary text-xs" disabled={!!busyId} onClick={() => void withUrl(async (url) => {
                  downloadDataUrl(await qrToPngDataUrl(url), `portal-qr-${active.id.slice(0, 8)}.png`);
                })}>PNG</button>
                <button type="button" className="btn-secondary text-xs" disabled={!!busyId} onClick={() => void withUrl(async (url) => {
                  downloadTextFile(await qrToSvgString(url), `portal-qr-${active.id.slice(0, 8)}.svg`, 'image/svg+xml');
                })}>SVG</button>
                <button type="button" className="btn-secondary text-xs" disabled={!!busyId} onClick={() => void withUrl(async (url) => {
                  await printQrSheet({
                    accessUrl: url,
                    title: active.label || 'Customer portal',
                    subtitle: 'Verify identity to open your portal',
                    template: printTemplate,
                    stickerInches,
                  });
                })}>Print / PDF</button>
                <button type="button" className="btn-secondary text-xs" disabled={!secureUrl} onClick={async () => {
                  if (!secureUrl) return;
                  await navigator.clipboard.writeText(secureUrl);
                  toast('Secure link copied', 'success');
                }}>Copy link</button>
              </div>
            </div>
          )}

          {(scans?.length ?? 0) > 0 && (
            <div className="text-sm">
              <p className="font-medium">Scan history</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">When</th>
                      <th className="px-2 py-1.5 font-medium">Validation</th>
                      <th className="px-2 py-1.5 font-medium">Auth</th>
                      <th className="px-2 py-1.5 font-medium">Device</th>
                      <th className="px-2 py-1.5 font-medium">Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scans!.map((s) => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="whitespace-nowrap px-2 py-1.5">
                          {new Date(s.scannedAt ?? s.createdAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 capitalize">{s.validationResult.replace(/_/g, ' ')}</td>
                        <td className="px-2 py-1.5 capitalize">
                          {(s.authenticationResult ?? '—').toString().replace(/_/g, ' ')}
                        </td>
                        <td className="px-2 py-1.5 capitalize">{s.deviceClass ?? '—'}</td>
                        <td className="px-2 py-1.5 font-mono text-[10px]">{s.diagnosticReference ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {codes.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium">QR history ({codes.length})</summary>
              <ul className="mt-2 space-y-1 text-xs">
                {codes.map((c) => (
                  <li key={c.id} className="capitalize">
                    {c.status.replace(/_/g, ' ')} · {c.type.replace(/_/g, ' ')} · scans {c.scanCount}
                    {c.expired ? ' · expired' : ''}
                    {c.label ? ` · ${c.label}` : ''}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}

      <PortalQrGeneratorModal
        open={modalOpen}
        customerId={customerId}
        hasActiveActivation={Boolean(active && active.accessMode === 'activation')}
        onClose={() => setModalOpen(false)}
        onGenerated={(url) => {
          rememberUrl(url);
          refetch();
          void utils.portal360.qrList.invalidate({ customerId });
        }}
      />
    </div>
  );
}
