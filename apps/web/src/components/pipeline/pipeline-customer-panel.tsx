'use client';

import { useState } from 'react';
import type { CustomerPipelineItem, CustomerStage } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { PIPELINE_STAGES, labelPipelineStage } from '@/lib/pipeline-utils';
import { X } from 'lucide-react';

type PipelineCustomerPanelProps = {
  customer: CustomerPipelineItem;
  onClose: () => void;
  onSaved: () => void;
};

export function PipelineCustomerPanel({ customer, onClose, onSaved }: PipelineCustomerPanelProps) {
  const { toast } = useToast();
  const [stage, setStage] = useState<CustomerStage>(customer.stage);
  const [nextAction, setNextAction] = useState(customer.nextAction ?? '');
  const [nextActionDue, setNextActionDue] = useState(
    customer.nextActionDue ? new Date(customer.nextActionDue).toISOString().slice(0, 10) : '',
  );
  const [estimatedValue, setEstimatedValue] = useState(
    customer.estimatedValueCents ? String((customer.estimatedValueCents / 100).toFixed(2)) : '',
  );
  const [assignedTo, setAssignedTo] = useState(customer.assignedTo ?? '');

  const save = trpc.customer360.updatePipelineCustomer.useMutation({
    onSuccess: () => {
      toast('Pipeline updated', 'success');
      onSaved();
      onClose();
    },
    onError: (error) => toast(error.message, 'error'),
  });

  const name = customer.businessName?.trim()
    ? customer.businessName
    : `${customer.firstName} ${customer.lastName}`.trim();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="flex h-full w-full max-w-md flex-col bg-surface shadow-xl">
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <h2 className="text-lg font-semibold">{name}</h2>
            <p className="text-sm text-muted-foreground">{labelPipelineStage(customer.stage)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <label className="block text-sm">
            <span className="text-muted-foreground">Stage</span>
            <select className="input mt-1 w-full" value={stage} onChange={(e) => setStage(e.target.value as CustomerStage)}>
              {PIPELINE_STAGES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Assigned rep</span>
            <input className="input mt-1 w-full" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Estimated value ($)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="input mt-1 w-full"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Next action</span>
            <input className="input mt-1 w-full" value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
          </label>

          <label className="block text-sm">
            <span className="text-muted-foreground">Due date</span>
            <input
              type="date"
              className="input mt-1 w-full"
              value={nextActionDue}
              onChange={(e) => setNextActionDue(e.target.value)}
            />
          </label>
        </div>

        <div className="border-t p-4">
          <button
            type="button"
            className="btn-primary w-full"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                customerId: customer.customerId,
                stage,
                nextAction: nextAction || null,
                nextActionDue: nextActionDue ? new Date(nextActionDue) : null,
                pipelineAssignedTo: assignedTo || null,
                pipelineEstimatedValueCents: estimatedValue
                  ? Math.round(Number(estimatedValue) * 100)
                  : null,
              })
            }
          >
            {save.isPending ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
