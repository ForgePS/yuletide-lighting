'use client';

import Link from 'next/link';
import type { CustomerPipelineItem } from '@clcrm/types';
import { formatCurrency } from '@clcrm/ui';
import { FileText, Phone, User } from 'lucide-react';
import { NextActionBadge } from './next-action-badge';
import { labelPipelineStage } from '@/lib/pipeline-utils';

export function CustomerPipelineCard({
  customer,
  onDragStart,
}: {
  customer: CustomerPipelineItem;
  onDragStart: () => void;
}) {
  const name = customer.businessName?.trim()
    ? customer.businessName
    : `${customer.firstName} ${customer.lastName}`.trim();
  const address = customer.primaryProperty
    ? `${customer.primaryProperty.city}, ${customer.primaryProperty.state}`
    : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm active:cursor-grabbing"
    >
      <Link
        href={`/app/customers/${customer.customerId}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        {name}
      </Link>
      {address && <p className="mt-0.5 text-xs text-muted-foreground">{address}</p>}
      {customer.estimatedValueCents > 0 && (
        <p className="mt-1 text-xs font-medium">{formatCurrency(customer.estimatedValueCents)}</p>
      )}
      {customer.assignedTo && (
        <p className="mt-1 text-[11px] text-muted-foreground">Rep: {customer.assignedTo}</p>
      )}
      <div className="mt-2">
        <NextActionBadge
          nextAction={customer.nextAction}
          nextActionDue={customer.nextActionDue}
          isOverdue={customer.isOverdue}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link
          href={`/app/customers/${customer.customerId}`}
          className="btn-secondary inline-flex items-center gap-1 px-2 py-1 text-xs"
        >
          <User className="h-3 w-3" />
          View
        </Link>
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs">
            <Phone className="h-3 w-3" />
            Call
          </a>
        )}
        <Link
          href={`/app/proposals/new?customerId=${customer.customerId}`}
          className="btn-ghost inline-flex items-center gap-1 px-2 py-1 text-xs text-primary"
        >
          <FileText className="h-3 w-3" />
          Proposal
        </Link>
      </div>
      <p className="sr-only">Stage: {labelPipelineStage(customer.stage)}</p>
    </div>
  );
}
