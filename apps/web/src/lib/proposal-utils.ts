import type { InstallType, ProposalListItem, ProposalStatus } from '@clcrm/types';
import { formatCurrency, formatDate } from '@clcrm/ui';

export const INSTALL_TYPE_OPTIONS: { value: InstallType; label: string }[] = [
  { value: 'roofline', label: 'Roofline' },
  { value: 'trees', label: 'Trees' },
  { value: 'wreaths', label: 'Wreaths' },
  { value: 'garland', label: 'Garland' },
  { value: 'commercial_display', label: 'Commercial Display' },
  { value: 'permanent_lighting', label: 'Permanent Lighting' },
  { value: 'service_call', label: 'Service Call' },
  { value: 'custom', label: 'Custom' },
];

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  internal_review: 'Internal Review',
  ready_to_send: 'Ready To Send',
  sent: 'Sent',
  viewed: 'Viewed',
  customer_questions: 'Customer Questions',
  approved: 'Approved',
  accepted: 'Approved',
  deposit_paid: 'Deposit Paid',
  scheduled: 'Scheduled',
  rejected: 'Rejected',
  declined: 'Rejected',
  expired: 'Expired',
};

export const PIPELINE_COLUMNS: ProposalStatus[] = [
  'draft',
  'internal_review',
  'ready_to_send',
  'sent',
  'viewed',
  'customer_questions',
  'approved',
  'deposit_paid',
  'scheduled',
  'rejected',
  'expired',
];

export function labelProposalStatus(status: string) {
  return PROPOSAL_STATUS_LABELS[status] ?? status;
}

export type ProposalStage = 'proposal' | 'invoice' | 'preparation' | 'installation' | 'lost';

export function deriveProposalStage(
  status: string,
  opts: { hasActiveInvoice?: boolean; depositPaid?: boolean } = {},
): ProposalStage {
  const normalized = status === 'accepted' ? 'approved' : status === 'declined' ? 'rejected' : status;
  if (['rejected', 'expired'].includes(normalized)) return 'lost';
  if (normalized === 'scheduled') return 'installation';
  if (opts.depositPaid || opts.hasActiveInvoice || normalized === 'deposit_paid') return 'invoice';
  if (normalized === 'approved') return 'invoice';
  return 'proposal';
}

export const PROPOSAL_STAGE_LABELS: Record<ProposalStage, string> = {
  proposal: 'Proposal',
  invoice: 'Invoice',
  preparation: 'Inventory prep',
  installation: 'Installation',
  lost: 'Lost',
};

export function labelInstallType(value?: string | null) {
  return INSTALL_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value?.replace(/_/g, ' ') ?? '—';
}

export const FINANCING_OPTION_LABELS: Record<string, string> = {
  full_payment: 'Full payment upfront',
  deposit_50: '50% deposit, balance on completion',
  monthly: 'Monthly payment plan',
  financing_partner: 'Third-party financing',
};

export function labelFinancingOption(value?: string | null) {
  return FINANCING_OPTION_LABELS[value ?? ''] ?? value?.replace(/_/g, ' ') ?? '—';
}

export function proposalDepositCents(proposal: { subtotalCents: number; depositPercent: number; depositAmountCents?: number }) {
  return proposal.depositAmountCents || Math.round(proposal.subtotalCents * proposal.depositPercent / 100);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

export function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    internal_review: 'bg-violet-100 text-violet-800',
    ready_to_send: 'bg-indigo-100 text-indigo-800',
    sent: 'bg-blue-100 text-blue-800',
    viewed: 'bg-sky-100 text-sky-800',
    customer_questions: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    deposit_paid: 'bg-teal-100 text-teal-800',
    scheduled: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    declined: 'bg-red-100 text-red-800',
    expired: 'bg-neutral-200 text-neutral-600',
  };
  return map[status] ?? map.draft;
}

export { formatCurrency, formatDate };

export function downloadProposalsCsv(proposals: ProposalListItem[]) {
  const headers = ['Title', 'Customer', 'Property', 'Status', 'Amount', 'Season', 'Install Type', 'Salesperson', 'Created'];
  const rows = proposals.map((p) => [
    p.title,
    p.customerName ?? '',
    p.propertyAddress ?? '',
    labelProposalStatus(p.status),
    (p.subtotalCents / 100).toFixed(2),
    p.season ?? '',
    p.installType ?? '',
    p.salespersonName ?? '',
    p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : '',
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proposals-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export const DEFAULT_PROPOSAL_TERMS = `Payment is due per the selected deposit and balance schedule. Installation dates are weather-dependent and will be confirmed after deposit receipt. Client agrees to provide safe ladder access and working GFCI outlets where noted. Takedown and storage services are included when listed in scope. Proposal valid for 30 days from send date.`;
