'use client';

import QRCode from 'qrcode';

export type QrRenderOptions = {
  size?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  dark?: string;
  light?: string;
};

export const STICKER_SIZES_IN = [
  { label: '1″', inches: 1 },
  { label: '1.5″', inches: 1.5 },
  { label: '2″', inches: 2 },
  { label: '2.5″', inches: 2.5 },
  { label: '3″', inches: 3 },
] as const;

export type PrintTemplateKind =
  | 'sticker'
  | 'postcard'
  | 'full_page'
  | 'welcome_letter'
  | 'invoice_insert'
  | 'installation_packet'
  | 'takedown_packet'
  | 'rebooking_mailer';

export const PRINT_TEMPLATE_OPTIONS: Array<{ value: PrintTemplateKind; label: string }> = [
  { value: 'sticker', label: 'Individual sticker' },
  { value: 'postcard', label: 'Postcard' },
  { value: 'full_page', label: 'Full-page QR' },
  { value: 'welcome_letter', label: 'Welcome letter' },
  { value: 'invoice_insert', label: 'Invoice insert' },
  { value: 'installation_packet', label: 'Installation packet' },
  { value: 'takedown_packet', label: 'Takedown packet' },
  { value: 'rebooking_mailer', label: 'Rebooking mailer' },
];

/** Merge field used in postcard artwork for customer-specific QR placement. */
export const CUSTOMER_PORTAL_QR_MERGE_FIELD = '{{customerPortalQrCode}}';

export type QrPlacementMode = 'print_direct' | 'blank_sticker' | 'hide';

export const QR_PLACEMENT_OPTIONS: Array<{ value: QrPlacementMode; label: string }> = [
  { value: 'print_direct', label: 'Print QR directly' },
  { value: 'blank_sticker', label: 'Leave blank sticker area' },
  { value: 'hide', label: 'Hide QR area' },
];

export type PostcardSize = { id: string; label: string; widthIn: number; heightIn: number };

export const POSTCARD_SIZES: PostcardSize[] = [
  { id: '6x4', label: '6″ × 4″', widthIn: 6, heightIn: 4 },
  { id: '7x5', label: '7″ × 5″', widthIn: 7, heightIn: 5 },
  { id: '9x6', label: '9″ × 6″', widthIn: 9, heightIn: 6 },
];

export type AveryLayout = {
  id: string;
  label: string;
  page: 'letter';
  columns: number;
  rows: number;
  labelWidthIn: number;
  labelHeightIn: number;
  marginTopIn: number;
  marginLeftIn: number;
  hPitchIn: number;
  vPitchIn: number;
};

/** Common Avery-compatible US Letter layouts. */
export const AVERY_LAYOUTS: AveryLayout[] = [
  {
    id: '5160',
    label: 'Avery 5160 (30 · 2.625″ × 1″)',
    page: 'letter',
    columns: 3,
    rows: 10,
    labelWidthIn: 2.625,
    labelHeightIn: 1,
    marginTopIn: 0.5,
    marginLeftIn: 0.1875,
    hPitchIn: 2.75,
    vPitchIn: 1,
  },
  {
    id: '5163',
    label: 'Avery 5163 (10 · 4″ × 2″)',
    page: 'letter',
    columns: 2,
    rows: 5,
    labelWidthIn: 4,
    labelHeightIn: 2,
    marginTopIn: 0.5,
    marginLeftIn: 0.15625,
    hPitchIn: 4.1875,
    vPitchIn: 2,
  },
  {
    id: 'sqr2',
    label: '2″ square stickers (12 / sheet)',
    page: 'letter',
    columns: 3,
    rows: 4,
    labelWidthIn: 2,
    labelHeightIn: 2,
    marginTopIn: 0.5,
    marginLeftIn: 0.75,
    hPitchIn: 2.5,
    vPitchIn: 2.5,
  },
];

export type BulkQrPrintItem = {
  accessUrl: string;
  title: string;
  subtitle?: string;
  customerName?: string;
  propertyLabel?: string;
};

export async function qrToPngDataUrl(url: string, opts: number | QrRenderOptions = 512): Promise<string> {
  const o = typeof opts === 'number' ? { size: opts } : opts;
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: o.errorCorrectionLevel ?? 'M',
    margin: o.margin ?? 2,
    width: o.size ?? 512,
    color: { dark: o.dark ?? '#1c1917', light: o.light ?? '#ffffff' },
  });
}

export async function qrToSvgString(url: string, opts: number | QrRenderOptions = 512): Promise<string> {
  const o = typeof opts === 'number' ? { size: opts } : opts;
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: o.errorCorrectionLevel ?? 'M',
    margin: o.margin ?? 2,
    width: o.size ?? 512,
    color: { dark: o.dark ?? '#1c1917', light: o.light ?? '#ffffff' },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function downloadTextFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function openPrintWindow(title: string, css: string, body: string) {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1100');
  if (!win) throw new Error('Pop-up blocked — allow pop-ups to print/PDF');
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
<style>${css}</style></head><body>
${body}
<script>window.onload=function(){window.print();}</script>
</body></html>`);
  win.document.close();
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function qrPlacementHtml(opts: {
  mode: QrPlacementMode;
  dataUrl: string;
  sizeIn: number;
  showUrl?: boolean;
  accessUrl?: string;
}) {
  if (opts.mode === 'hide') return '';
  if (opts.mode === 'blank_sticker') {
    return `
    <div class="qr-slot blank" style="width:${opts.sizeIn}in;height:${opts.sizeIn}in">
      <span class="merge">${CUSTOMER_PORTAL_QR_MERGE_FIELD}</span>
      <span class="slot-hint">QR sticker area</span>
    </div>`;
  }
  return `
    <div class="qr-slot" style="width:${opts.sizeIn}in;height:${opts.sizeIn}in">
      <img src="${opts.dataUrl}" alt="Portal QR code" />
    </div>
    ${opts.showUrl !== false && opts.accessUrl ? `<p class="url">${escapeHtml(opts.accessUrl)}</p>` : ''}`;
}

const SHARED_PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1c1917; margin: 0; padding: 16px; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { margin: 6px 0; font-size: 13px; color: #44403c; }
  .eyebrow { text-transform: uppercase; letter-spacing: 0.06em; font-size: 11px; }
  .url { font-family: ui-monospace, monospace; font-size: 9px; word-break: break-all; max-width: 420px; margin: 12px auto 0; }
  .hint { margin-top: 12px; font-size: 12px; }
  .qr-box, .qr-slot { margin: 12px auto; border: 1px dashed #a8a29e; padding: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .qr-box img, .qr-slot img { width: 100%; height: 100%; object-fit: contain; display: block; }
  .qr-box.large { width: 3.2in; height: 3.2in; }
  .qr-slot.blank { background: repeating-linear-gradient(45deg,#fafaf9,#fafaf9 8px,#f5f5f4 8px,#f5f5f4 16px); color: #78716c; }
  .merge { font-family: ui-monospace, monospace; font-size: 10px; }
  .slot-hint { font-size: 10px; margin-top: 4px; }
  .sticker { margin: 0 auto; text-align: center; position: relative; }
  .boundary { position: absolute; inset: -6px; border: 1px solid #d6d3d1; pointer-events: none; }
  .sheet { text-align: center; max-width: 6.5in; margin: 0 auto; }
  .safe { outline: 1px dashed #bbf7d0; }
  .page-break { page-break-after: always; break-after: page; }
`;

/** Open a print-ready label/PDF sheet (user can Save as PDF). */
export async function printQrSheet(opts: {
  accessUrl: string;
  title: string;
  subtitle?: string;
  companyName?: string;
  template?: PrintTemplateKind;
  stickerInches?: number;
  showUrl?: boolean;
  instructions?: string;
  customerName?: string;
  propertyLabel?: string;
  qrPlacement?: QrPlacementMode;
  postcardSizeId?: string;
}) {
  const dataUrl = await qrToPngDataUrl(opts.accessUrl, {
    size: 640,
    errorCorrectionLevel: 'M',
    margin: 2,
  });
  const inches = opts.stickerInches ?? 2;
  const template = opts.template ?? 'sticker';
  const company = escapeHtml(opts.companyName ?? 'Yuletide Lighting');
  const title = escapeHtml(opts.title);
  const subtitle = opts.subtitle ? escapeHtml(opts.subtitle) : '';
  const hint = escapeHtml(opts.instructions ?? 'Scan to open your portal');
  const customerName = opts.customerName ? escapeHtml(opts.customerName) : '';
  const propertyLabel = opts.propertyLabel ? escapeHtml(opts.propertyLabel) : '';
  const placement = opts.qrPlacement ?? 'print_direct';

  if (template === 'postcard') {
    await printPostcard({
      accessUrl: opts.accessUrl,
      companyName: opts.companyName,
      customerName: opts.customerName,
      propertyLabel: opts.propertyLabel,
      instructions: opts.instructions,
      qrPlacement: placement,
      sizeId: opts.postcardSizeId ?? '6x4',
      showUrl: opts.showUrl,
      showBack: true,
    });
    return;
  }

  const qrCssIn = `${inches}in`;
  const qrArea = qrPlacementHtml({
    mode: placement,
    dataUrl,
    sizeIn: inches,
    showUrl: opts.showUrl,
    accessUrl: opts.accessUrl,
  });
  const identity = [
    customerName ? `<p><strong>${customerName}</strong></p>` : '',
    propertyLabel ? `<p>${propertyLabel}</p>` : '',
  ].join('');

  const packetCopy: Record<string, string> = {
    installation_packet: 'Keep this code handy during installation season for schedules, photos, and service.',
    takedown_packet: 'Scan to confirm takedown preferences and track removal progress.',
    rebooking_mailer: 'Reserve next season early — scan to rebook and review last year’s design.',
    welcome_letter: 'Welcome — use this code to activate your customer portal and manage your lighting account.',
    invoice_insert: 'Scan to view this invoice and manage your portal account.',
  };

  const body =
    template === 'full_page' || template === 'welcome_letter' || template === 'installation_packet'
    || template === 'takedown_packet' || template === 'rebooking_mailer'
      ? `
  <div class="sheet safe">
    <p class="eyebrow">${company}</p>
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
    ${identity}
    ${packetCopy[template] ? `<p>${packetCopy[template]}</p>` : ''}
    ${placement === 'print_direct'
      ? `<div class="qr-box large"><img src="${dataUrl}" alt="Portal QR code" /></div>${opts.showUrl !== false ? `<p class="url">${escapeHtml(opts.accessUrl)}</p>` : ''}`
      : qrArea}
    <p class="hint">${opts.instructions ? escapeHtml(opts.instructions) : 'Scan to open your customer portal'}</p>
  </div>`
      : template === 'invoice_insert'
        ? `
  <div class="sheet insert">
    <p class="eyebrow">${company}</p>
    <h1>Pay &amp; manage online</h1>
    ${identity}
    <p>${subtitle || packetCopy.invoice_insert}</p>
    ${qrArea || `<div class="qr-box" style="width:${qrCssIn};height:${qrCssIn}"><img src="${dataUrl}" alt="Portal QR code" /></div>`}
    <p class="hint">${hint}</p>
  </div>`
        : `
  <div class="sticker" style="width:${qrCssIn}">
    <p class="eyebrow">${company}</p>
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
    ${identity}
    ${qrArea || `<div class="qr-box" style="width:${qrCssIn};height:${qrCssIn}"><img src="${dataUrl}" alt="Portal QR code" /></div>`}
    <p class="hint">${hint}</p>
    <div class="boundary"></div>
  </div>`;

  openPrintWindow(opts.title, `@page { margin: 0.4in; size: letter; }${SHARED_PRINT_CSS}`, body);
}

export async function printPostcard(opts: {
  accessUrl: string;
  companyName?: string;
  customerName?: string;
  propertyLabel?: string;
  instructions?: string;
  supportPhone?: string;
  supportEmail?: string;
  qrPlacement?: QrPlacementMode;
  sizeId?: string;
  showUrl?: boolean;
  showBack?: boolean;
  stickerInches?: number;
}) {
  const size = POSTCARD_SIZES.find((s) => s.id === (opts.sizeId ?? '6x4')) ?? POSTCARD_SIZES[0]!;
  const placement = opts.qrPlacement ?? 'blank_sticker';
  const dataUrl = await qrToPngDataUrl(opts.accessUrl, { size: 640, errorCorrectionLevel: 'M' });
  const qrSize = opts.stickerInches ?? Math.min(2, size.heightIn * 0.45);
  const company = escapeHtml(opts.companyName ?? 'Yuletide Lighting');
  const qrArea = qrPlacementHtml({
    mode: placement,
    dataUrl,
    sizeIn: qrSize,
    showUrl: opts.showUrl ?? false,
    accessUrl: opts.accessUrl,
  });

  const front = `
  <div class="postcard front" style="width:${size.widthIn}in;min-height:${size.heightIn}in">
    <div class="bleed"></div>
    <div class="safe-pad">
      <p class="eyebrow">${company}</p>
      <h1>Customer Portal</h1>
      <p>View proposals, schedules, invoices, and service — all in one place.</p>
      ${opts.customerName ? `<p class="name">${escapeHtml(opts.customerName)}</p>` : ''}
      ${opts.propertyLabel ? `<p>${escapeHtml(opts.propertyLabel)}</p>` : ''}
      ${qrArea}
      <p class="hint">${escapeHtml(opts.instructions ?? 'Verify your identity after scanning.')}</p>
    </div>
  </div>`;

  const back = opts.showBack !== false ? `
  <div class="postcard back page-break" style="width:${size.widthIn}in;min-height:${size.heightIn}in">
    <div class="safe-pad">
      <p class="eyebrow">${company}</p>
      <h1>How to activate</h1>
      <ol>
        <li>Scan the QR code on the front${placement === 'blank_sticker' ? ' (or apply your sticker)' : ''}.</li>
        <li>Confirm your email or phone with a one-time code.</li>
        <li>Accept portal terms and open your account.</li>
      </ol>
      <p>Support: ${escapeHtml(opts.supportPhone ?? '')} ${escapeHtml(opts.supportEmail ?? 'hello@yuletidelighting.com')}</p>
      <p class="merge-note">Artwork field: ${CUSTOMER_PORTAL_QR_MERGE_FIELD}</p>
    </div>
  </div>` : '';

  openPrintWindow('Portal postcard', `
  @page { margin: 0.25in; size: landscape; }
  ${SHARED_PRINT_CSS}
  .postcard { position: relative; margin: 0 auto 16px; border: 1px solid #d6d3d1; text-align: center; overflow: hidden; }
  .bleed { position: absolute; inset: -0.125in; border: 1px dashed #e7e5e4; pointer-events: none; }
  .safe-pad { padding: 0.35in; position: relative; }
  .name { font-size: 16px; font-weight: 600; color: #1c1917; }
  ol { text-align: left; max-width: 4.5in; margin: 12px auto; font-size: 13px; color: #44403c; }
  .merge-note { font-family: ui-monospace, monospace; font-size: 10px; color: #a8a29e; }
  `, front + back);
}

export async function printAverySheet(opts: {
  items: BulkQrPrintItem[];
  layoutId?: string;
  companyName?: string;
  showUrl?: boolean;
}) {
  const layout = AVERY_LAYOUTS.find((l) => l.id === (opts.layoutId ?? '5160')) ?? AVERY_LAYOUTS[0]!;
  const perPage = layout.columns * layout.rows;
  const pngs = await Promise.all(
    opts.items.map(async (item) => ({
      ...item,
      dataUrl: await qrToPngDataUrl(item.accessUrl, { size: 256, errorCorrectionLevel: 'M', margin: 1 }),
    })),
  );

  const pages: string[] = [];
  for (let start = 0; start < Math.max(pngs.length, 1); start += perPage) {
    const slice = pngs.slice(start, start + perPage);
    const cells: string[] = [];
    for (let i = 0; i < perPage; i++) {
      const row = Math.floor(i / layout.columns);
      const col = i % layout.columns;
      const left = layout.marginLeftIn + col * layout.hPitchIn;
      const top = layout.marginTopIn + row * layout.vPitchIn;
      const item = slice[i];
      cells.push(`
      <div class="label" style="left:${left}in;top:${top}in;width:${layout.labelWidthIn}in;height:${layout.labelHeightIn}in">
        ${item ? `
          <img src="${item.dataUrl}" alt="" />
          <p class="t">${escapeHtml(item.title)}</p>
          ${item.subtitle ? `<p class="s">${escapeHtml(item.subtitle)}</p>` : ''}
          ${opts.showUrl ? `<p class="u">${escapeHtml(item.accessUrl)}</p>` : ''}
        ` : ''}
      </div>`);
    }
    pages.push(`<div class="sheet-page${start + perPage < pngs.length ? ' page-break' : ''}">${cells.join('')}</div>`);
  }

  openPrintWindow(`Avery ${layout.id}`, `
  @page { margin: 0; size: letter; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; color: #1c1917; }
  .sheet-page { position: relative; width: 8.5in; height: 11in; }
  .label { position: absolute; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.06in; text-align: center; }
  .label img { max-width: 70%; max-height: 55%; object-fit: contain; }
  .t { margin: 2px 0 0; font-size: 8px; font-weight: 600; line-height: 1.1; }
  .s { margin: 0; font-size: 7px; color: #57534e; }
  .u { margin: 0; font-size: 5px; word-break: break-all; font-family: ui-monospace, monospace; }
  .page-break { page-break-after: always; break-after: page; }
  `, pages.join(''));
}

/** Store-method ZIP (no compression) — suitable for PNG/SVG batch export. */
export async function downloadQrZip(
  items: Array<{ accessUrl: string; filenameBase: string }>,
  zipName = 'portal-qr-codes.zip',
) {
  const files: Array<{ name: string; data: Uint8Array }> = [];
  for (const item of items) {
    const png = await qrToPngDataUrl(item.accessUrl, { size: 1024, errorCorrectionLevel: 'M' });
    const svg = await qrToSvgString(item.accessUrl, { size: 1024, errorCorrectionLevel: 'M' });
    const base = item.filenameBase.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'qr';
    files.push({ name: `${base}.png`, data: dataUrlToBytes(png) });
    files.push({ name: `${base}.svg`, data: new TextEncoder().encode(svg) });
  }
  const blob = buildStoreZip(files);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipName;
  a.click();
  URL.revokeObjectURL(url);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? '';
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(n: number) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n: number) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function concat(parts: Uint8Array[]) {
  const len = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function buildStoreZip(files: Array<{ name: string; data: Uint8Array }>): Blob {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes,
      file.data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes,
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  }

  const centralDir = concat(centralParts);
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return new Blob([concat([...localParts, centralDir, end])], { type: 'application/zip' });
}
