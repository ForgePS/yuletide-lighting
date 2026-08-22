'use client';

import { useEffect, useState } from 'react';
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
  type QrRenderOptions,
} from '@/lib/portal-qr';

const EXPIRY_PRESETS: Array<{ label: string; days: number | null }> = [
  { label: 'No fixed expiration', days: null },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
];

const QR_TYPES = [
  { value: 'customer_portal', label: 'Customer portal (activation)' },
  { value: 'property', label: 'Property' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'service_request', label: 'Service request' },
  { value: 'installation', label: 'Installation' },
  { value: 'takedown', label: 'Takedown' },
  { value: 'rebooking', label: 'Rebooking' },
] as const;

const PRINT_TEMPLATES = PRINT_TEMPLATE_OPTIONS;

type Props = {
  open: boolean;
  customerId: string;
  hasActiveActivation?: boolean;
  onClose: () => void;
  onGenerated: (accessUrl: string) => void;
};

export function PortalQrGeneratorModal({
  open,
  customerId,
  hasActiveActivation,
  onClose,
  onGenerated,
}: Props) {
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [type, setType] = useState<(typeof QR_TYPES)[number]['value']>('customer_portal');
  const [expiryDays, setExpiryDays] = useState<number | null>(null);
  const [reusable, setReusable] = useState(false);
  const [requireVerify, setRequireVerify] = useState(true);
  const [ecc, setEcc] = useState<QrRenderOptions['errorCorrectionLevel']>('M');
  const [stickerInches, setStickerInches] = useState(2);
  const [template, setTemplate] = useState<PrintTemplateKind>('sticker');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [accessUrl, setAccessUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = trpc.portal360.qrGenerate.useMutation({
    onError: (e) => toast(e.message, 'error'),
  });

  useEffect(() => {
    if (!open) return;
    setLabel('');
    setType('customer_portal');
    setExpiryDays(null);
    setReusable(false);
    setRequireVerify(true);
    setEcc('M');
    setAccessUrl(null);
    setPreviewUrl(null);
  }, [open, customerId]);

  useEffect(() => {
    let cancelled = false;
    const url = accessUrl ?? 'https://yuletide-lighting.web.app/portal/access/preview-sample-token';
    void qrToPngDataUrl(url, { size: 320, errorCorrectionLevel: ecc, margin: 2 }).then((png) => {
      if (!cancelled) setPreviewUrl(png);
    });
    return () => { cancelled = true; };
  }, [accessUrl, ecc]);

  if (!open) return null;

  const expiresAt = expiryDays == null ? null : new Date(Date.now() + expiryDays * 86400000);
  const accessMode = type === 'customer_portal' ? 'activation' as const : 'authenticated_deep_link' as const;
  const isPreviewOnly = !accessUrl;

  async function handleGenerate() {
    const result = await generate.mutateAsync({
      customerId,
      label: label || null,
      type,
      expiresAt,
      reusable: type === 'customer_portal' ? reusable : true,
      requireIdentityVerification: requireVerify,
      accessMode,
      replaceExistingActivation: type === 'customer_portal' && Boolean(hasActiveActivation),
    });
    setAccessUrl(result.accessUrl);
    onGenerated(result.accessUrl);
    toast('Secure QR generated — download now (link cannot be reconstructed later)', 'success');
  }

  async function withSecure(action: (url: string) => Promise<void>) {
    if (!accessUrl) {
      toast('Generate the QR first', 'error');
      return;
    }
    setBusy(true);
    try {
      await action(accessUrl);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div className="relative z-10 my-4 w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Generate portal QR</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Cryptographic token hashed at rest. Scanning starts verification — it does not permanently log anyone in.
            </p>
          </div>
          <button type="button" className="btn-ghost text-sm" onClick={onClose}>Close</button>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_200px]">
          <div className="space-y-3">
            <label className="block text-sm">
              <span className="font-medium">Type</span>
              <select className="input mt-1 w-full" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                {QR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="font-medium">Label</span>
              <input className="input mt-1 w-full" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Welcome packet" />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Expiration</span>
              <select
                className="input mt-1 w-full"
                value={expiryDays ?? ''}
                onChange={(e) => setExpiryDays(e.target.value === '' ? null : Number(e.target.value))}
              >
                {EXPIRY_PRESETS.map((p) => (
                  <option key={p.label} value={p.days ?? ''}>{p.label}</option>
                ))}
              </select>
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">Error correction</span>
                <select className="input mt-1 w-full" value={ecc} onChange={(e) => setEcc(e.target.value as typeof ecc)}>
                  <option value="L">L (low)</option>
                  <option value="M">M (medium)</option>
                  <option value="Q">Q (quartile)</option>
                  <option value="H">H (high)</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium">Print template</span>
                <select className="input mt-1 w-full" value={template} onChange={(e) => setTemplate(e.target.value as PrintTemplateKind)}>
                  {PRINT_TEMPLATES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm">
              <span className="font-medium">Sticker size</span>
              <select className="input mt-1 w-full" value={stickerInches} onChange={(e) => setStickerInches(Number(e.target.value))}>
                {STICKER_SIZES_IN.map((s) => (
                  <option key={s.inches} value={s.inches}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={requireVerify} onChange={(e) => setRequireVerify(e.target.checked)} />
              Require identity verification (OTP)
            </label>
            {type === 'customer_portal' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={reusable} onChange={(e) => setReusable(e.target.checked)} />
                Reusable after activation
              </label>
            )}
            {type === 'customer_portal' && hasActiveActivation && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                An active activation QR exists. Generating will replace it.
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="rounded-xl border border-border bg-white p-3">
              {previewUrl ? (
                <img src={previewUrl} alt="QR preview" className="h-40 w-40" />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center text-xs text-muted-foreground">Preview…</div>
              )}
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              {isPreviewOnly ? 'Sample layout — generate for the real secure code' : 'Live secure QR'}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <button
            type="button"
            className="btn-primary text-sm"
            disabled={generate.isPending}
            onClick={() => void handleGenerate()}
          >
            {generate.isPending ? 'Generating…' : accessUrl ? 'Regenerate' : 'Generate QR'}
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={!accessUrl || busy}
            onClick={() => void withSecure(async (url) => {
              downloadDataUrl(await qrToPngDataUrl(url, { size: 1024, errorCorrectionLevel: ecc }), 'portal-qr.png');
            })}
          >
            PNG
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={!accessUrl || busy}
            onClick={() => void withSecure(async (url) => {
              downloadTextFile(await qrToSvgString(url, { size: 1024, errorCorrectionLevel: ecc }), 'portal-qr.svg', 'image/svg+xml');
            })}
          >
            SVG
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={!accessUrl || busy}
            onClick={() => void withSecure(async (url) => {
              await printQrSheet({
                accessUrl: url,
                title: label || 'Customer portal',
                subtitle: 'Verify identity to open your portal',
                template,
                stickerInches,
              });
            })}
          >
            Print / PDF
          </button>
          <button
            type="button"
            className="btn-secondary text-xs"
            disabled={!accessUrl}
            onClick={async () => {
              if (!accessUrl) return;
              await navigator.clipboard.writeText(accessUrl);
              toast('Secure link copied', 'success');
            }}
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}
