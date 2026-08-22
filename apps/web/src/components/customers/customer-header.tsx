'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Archive, Briefcase, CreditCard, Edit, FileText, MapPin, MessageSquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SectionNav } from '@/components/ui/section-nav';
import { formatCurrency } from '@clcrm/ui';
import {
  customerDisplayName,
  formatDate,
  labelCustomerStatus,
  labelCustomerType,
  labelPipelineStage,
  statusBadgeClass,
} from '@/lib/customer360-utils';

type CustomerHeaderProps = {
  customerId: string;
  customer: {
    firstName: string;
    lastName: string;
    businessName?: string | null;
    customerType?: string | null;
    status?: string | null;
    createdAt: Date;
    assignedSalespersonName?: string | null;
    preferredContactMethod?: string | null;
    email?: string | null;
    phone?: string | null;
    mobilePhone?: string | null;
    referralSource?: string | null;
    pipelineStage?: string | null;
    nextAction?: string | null;
    nextActionDue?: Date | null;
    tags?: string[];
    stats?: {
      lifetimeRevenueCents?: number;
      outstandingBalanceCents?: number;
    } | null;
  };
};

export function CustomerHeader({ customerId, customer }: CustomerHeaderProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [archiveOpen, setArchiveOpen] = useState(false);
  const archive = trpc.customer360.archive.useMutation({
    onSuccess: () => {
      toast('Customer archived', 'success');
      router.refresh();
      setArchiveOpen(false);
    },
    onError: () => toast('Could not archive customer', 'error'),
  });

  const phone = customer.mobilePhone || customer.phone;

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{customerDisplayName(customer)}</h1>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
              {labelCustomerType(customer.customerType)}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(customer.status)}`}>
              {labelCustomerStatus(customer.status)}
            </span>
            {customer.pipelineStage && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {labelPipelineStage(customer.pipelineStage)}
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>Customer since {formatDate(customer.createdAt)}</span>
            {customer.assignedSalespersonName && <span>Owner: {customer.assignedSalespersonName}</span>}
            {customer.referralSource && <span>Source: {customer.referralSource}</span>}
            {customer.preferredContactMethod && <span>Prefers {customer.preferredContactMethod}</span>}
            {phone && <span>{phone}</span>}
            {customer.email && <span>{customer.email}</span>}
          </div>
          {(customer.stats || customer.nextAction) && (
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {typeof customer.stats?.lifetimeRevenueCents === 'number' && (
                <span>
                  <span className="text-muted-foreground">Lifetime </span>
                  <span className="font-semibold">{formatCurrency(customer.stats.lifetimeRevenueCents)}</span>
                </span>
              )}
              {typeof customer.stats?.outstandingBalanceCents === 'number' && customer.stats.outstandingBalanceCents > 0 && (
                <span>
                  <span className="text-muted-foreground">Balance due </span>
                  <span className="font-semibold text-amber-700">
                    {formatCurrency(customer.stats.outstandingBalanceCents)}
                  </span>
                </span>
              )}
              {customer.nextAction && (
                <span>
                  <span className="text-muted-foreground">Next </span>
                  <span className="font-medium">{customer.nextAction}</span>
                  {customer.nextActionDue ? ` · ${formatDate(customer.nextActionDue)}` : ''}
                </span>
              )}
            </div>
          )}
          {!!customer.tags?.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {customer.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/customers/${customerId}/edit`} className="btn-secondary">
            <Edit className="h-4 w-4" />
            Edit
          </Link>
          <Link href={`/app/customers/${customerId}/properties`} className="btn-secondary">
            <MapPin className="h-4 w-4" />
            Property
          </Link>
          <Link href={`/app/customers/${customerId}/communications`} className="btn-secondary">
            <MessageSquarePlus className="h-4 w-4" />
            Communication
          </Link>
          <Link href={`/app/customers/${customerId}/billing`} className="btn-secondary">
            <CreditCard className="h-4 w-4" />
            Billing
          </Link>
          <Link href={`/app/proposals/new?customerId=${customerId}`} className="btn-secondary">
            <FileText className="h-4 w-4" />
            Quote
          </Link>
          <Link href={`/app/customers/${customerId}/jobs`} className="btn-secondary">
            <Briefcase className="h-4 w-4" />
            Job
          </Link>
          <button type="button" className="btn-secondary" onClick={() => setArchiveOpen(true)}>
            <Archive className="h-4 w-4" />
            Archive
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={archiveOpen}
        title="Archive customer?"
        message="This will mark the customer as archived. You can still view their history."
        confirmLabel="Archive"
        destructive
        loading={archive.isPending}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => archive.mutate({ customerId })}
      />
    </div>
  );
}

const TABS = [
  { segment: '', label: 'Overview' },
  { segment: 'contacts', label: 'Contacts' },
  { segment: 'properties', label: 'Properties' },
  { segment: 'consultations', label: 'Consultations' },
  { segment: 'timeline', label: 'Timeline' },
  { segment: 'sales', label: 'Sales' },
  { segment: 'designs', label: 'Designs' },
  { segment: 'jobs', label: 'Jobs' },
  { segment: 'billing', label: 'Billing' },
  { segment: 'documents', label: 'Documents' },
  { segment: 'storage', label: 'Storage' },
  { segment: 'communications', label: 'Communications' },
] as const;

export function CustomerTabs({ customerId }: { customerId: string }) {
  const pathname = usePathname();
  const base = `/app/customers/${customerId}`;
  const tabs = TABS.map((tab) => ({
    href: tab.segment ? `${base}/${tab.segment}` : base,
    label: tab.label,
    segment: tab.segment,
  }));

  return (
    <SectionNav
      tabs={tabs}
      pathname={pathname}
      isActive={(tab, path) => {
        const segment = tabs.find((item) => item.href === tab.href)?.segment ?? '';
        return segment === '' ? path === base : path.startsWith(tab.href);
      }}
    />
  );
}
