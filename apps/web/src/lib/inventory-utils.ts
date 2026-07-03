import { formatCurrency } from '@clcrm/ui';

export { formatCurrency };

export const INVENTORY_NAV: Array<{ href: string; label: string; exact?: boolean }> = [
  { href: '/app/inventory', label: 'Items', exact: true },
  { href: '/app/inventory/locations', label: 'Locations' },
  { href: '/app/inventory/scan', label: 'Scan' },
  { href: '/app/inventory/dashboard', label: 'Analytics' },
  { href: '/app/inventory/categories', label: 'Categories' },
  { href: '/app/inventory/warehouse', label: 'Warehouse' },
  { href: '/app/inventory/trucks', label: 'Trucks' },
  { href: '/app/inventory/customers', label: 'Customer-owned' },
  { href: '/app/inventory/purchase-orders', label: 'Purchase orders' },
  { href: '/app/inventory/transfers', label: 'Transfers' },
  { href: '/app/inventory/audits', label: 'Audits' },
  { href: '/app/inventory/reports', label: 'Reports' },
];

export function stockLevelColor(available: number, reorder: number) {
  if (available <= 0) return 'bg-red-500';
  if (available <= reorder) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export function formatMultiPrice(
  prices: Array<{ agreementCode: string; unitPriceCents: number }>,
  sellPriceCents: number,
) {
  if (prices.length) {
    return prices
      .map((p) => `${p.agreementCode.toUpperCase()}: ${formatCurrency(p.unitPriceCents)}`)
      .join(' · ');
  }
  return sellPriceCents > 0 ? formatCurrency(sellPriceCents) : '—';
}

export function downloadInventoryCsv(
  items: Array<{
    sku: string;
    name: string;
    categoryName?: string | null;
    locationPath?: string | null;
    unitCostCents: number;
    sellPriceCents: number;
    quantityOnHand: number;
  }>,
) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ['SKU', 'Name', 'Category', 'Storage Location', 'Cost', 'Single Price', 'Stock Current'];
  const rows = items.map((item) => [
    item.sku,
    item.name,
    item.categoryName ?? '',
    item.locationPath ?? '',
    (item.unitCostCents / 100).toFixed(2),
    (item.sellPriceCents / 100).toFixed(2),
    String(item.quantityOnHand),
  ].map(escape).join(','));

  const blob = new Blob([[header.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
