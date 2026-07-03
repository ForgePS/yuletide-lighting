import { formatCurrency } from '@clcrm/ui';

export { formatCurrency };

export const REPORTS_NAV = [
  { href: '/app/reports/dashboard', label: 'Executive' },
  { href: '/app/reports/sales', label: 'Sales' },
  { href: '/app/reports/operations', label: 'Operations' },
  { href: '/app/reports/customers', label: 'Customers' },
  { href: '/app/reports/inventory', label: 'Inventory' },
  { href: '/app/reports/financial', label: 'Financial' },
  { href: '/app/reports/crews', label: 'Crews' },
  { href: '/app/reports/seasonal', label: 'Seasonal' },
  { href: '/app/reports/forecasting', label: 'Forecasting' },
  { href: '/app/reports/custom', label: 'Custom' },
];

export const AI_SUGGESTIONS = [
  'Show my highest profit customers',
  'Which crews are underperforming?',
  'Forecast next season\'s revenue',
  'Which services have the highest margin?',
  'Show overdue invoices over $1,000',
  'Predict inventory needs for October',
];

export function formatPercent(value: number) {
  return `${value}%`;
}

export function downloadExport(content: string, filename: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
