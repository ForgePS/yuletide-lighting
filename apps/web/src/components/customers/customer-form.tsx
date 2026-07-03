'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import {
  CustomerAddressFields,
  emptyCustomerAddressForm,
  type CustomerAddressFormState,
} from '@/components/customer-address-fields';
import {
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
} from '@/lib/customer360-utils';

export type CustomerFormValues = CustomerAddressFormState & {
  firstName: string;
  lastName: string;
  businessName: string;
  customerType: string;
  status: string;
  referralSource: string;
  assignedSalespersonName: string;
  email: string;
  secondaryEmail: string;
  phone: string;
  mobilePhone: string;
  preferredContactMethod: string;
  notes: string;
  mailingSameAsBilling: boolean;
  mailingAddressLine1: string;
  mailingAddressLine2: string;
  mailingCity: string;
  mailingState: string;
  mailingPostalCode: string;
};

export const emptyCustomerForm: CustomerFormValues = {
  firstName: '',
  lastName: '',
  businessName: '',
  customerType: 'residential',
  status: 'lead',
  referralSource: '',
  assignedSalespersonName: '',
  email: '',
  secondaryEmail: '',
  phone: '',
  mobilePhone: '',
  preferredContactMethod: 'email',
  notes: '',
  mailingSameAsBilling: true,
  mailingAddressLine1: '',
  mailingAddressLine2: '',
  mailingCity: '',
  mailingState: '',
  mailingPostalCode: '',
  ...emptyCustomerAddressForm,
};

type CustomerFormProps = {
  mode: 'create' | 'edit';
  customerId?: string;
  initial?: Partial<CustomerFormValues>;
};

export function CustomerForm({ mode, customerId, initial }: CustomerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<CustomerFormValues>({ ...emptyCustomerForm, ...initial });
  const createMutation = trpc.customer360.create.useMutation();
  const updateMutation = trpc.customer360.update.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === 'create') {
        const customer = await createMutation.mutateAsync(form as never);
        toast('Customer created successfully', 'success');
        router.push(`/app/customers/${customer.id}`);
      } else if (customerId) {
        await updateMutation.mutateAsync({ customerId, data: form as never });
        toast('Customer updated successfully', 'success');
        router.push(`/app/customers/${customerId}`);
      }
    } catch {
      toast('Could not save customer. Check required fields.', 'error');
    }
  }

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="card space-y-8 p-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <input required placeholder="First name *" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input" />
          <input required placeholder="Last name *" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input" />
          <input placeholder="Business name" value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} className="input sm:col-span-2" />
          <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })} className="input">
            {CUSTOMER_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input">
            {CUSTOMER_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input placeholder="Referral source" value={form.referralSource} onChange={(e) => setForm({ ...form, referralSource: e.target.value })} className="input" />
          <input placeholder="Assigned salesperson" value={form.assignedSalespersonName} onChange={(e) => setForm({ ...form, assignedSalespersonName: e.target.value })} className="input" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
          <input placeholder="Mobile phone" value={form.mobilePhone} onChange={(e) => setForm({ ...form, mobilePhone: e.target.value })} className="input" />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          <input placeholder="Secondary email" type="email" value={form.secondaryEmail} onChange={(e) => setForm({ ...form, secondaryEmail: e.target.value })} className="input" />
          <select value={form.preferredContactMethod} onChange={(e) => setForm({ ...form, preferredContactMethod: e.target.value })} className="input">
            <option value="phone">Phone</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
        </div>
      </fieldset>

      <CustomerAddressFields value={form} onChange={(addressFields) => setForm({ ...form, ...addressFields })} />

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Mailing address</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={form.mailingSameAsBilling} onChange={(e) => setForm({ ...form, mailingSameAsBilling: e.target.checked })} className="h-4 w-4 rounded" />
          Mailing address same as billing address
        </label>
        {!form.mailingSameAsBilling && (
          <div className="space-y-4 border-l-2 border-primary/20 pl-4">
            <input required placeholder="Mailing street" value={form.mailingAddressLine1} onChange={(e) => setForm({ ...form, mailingAddressLine1: e.target.value })} className="input" />
            <input placeholder="Apt, suite" value={form.mailingAddressLine2} onChange={(e) => setForm({ ...form, mailingAddressLine2: e.target.value })} className="input" />
            <div className="grid gap-4 sm:grid-cols-3">
              <input required placeholder="City" value={form.mailingCity} onChange={(e) => setForm({ ...form, mailingCity: e.target.value })} className="input" />
              <input required placeholder="State" value={form.mailingState} onChange={(e) => setForm({ ...form, mailingState: e.target.value })} className="input" />
              <input required placeholder="ZIP" value={form.mailingPostalCode} onChange={(e) => setForm({ ...form, mailingPostalCode: e.target.value })} className="input" />
            </div>
          </div>
        )}
      </fieldset>

      <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input min-h-[100px] resize-y" rows={4} />

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Saving...' : mode === 'create' ? 'Create customer' : 'Save changes'}
        </button>
        <Link href={mode === 'edit' && customerId ? `/app/customers/${customerId}` : '/app/customers'} className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function customerToFormValues(customer: Record<string, unknown>, primary?: Record<string, unknown> | null): CustomerFormValues {
  return {
    ...emptyCustomerForm,
    firstName: String(customer.firstName ?? ''),
    lastName: String(customer.lastName ?? ''),
    businessName: String(customer.businessName ?? ''),
    customerType: String(customer.customerType ?? 'residential'),
    status: String(customer.status ?? 'lead'),
    referralSource: String(customer.referralSource ?? ''),
    assignedSalespersonName: String(customer.assignedSalespersonName ?? ''),
    email: String(customer.email ?? ''),
    secondaryEmail: String(customer.secondaryEmail ?? ''),
    phone: String(customer.phone ?? ''),
    mobilePhone: String(customer.mobilePhone ?? ''),
    preferredContactMethod: String(customer.preferredContactMethod ?? 'email'),
    notes: String(customer.notes ?? ''),
    billingSameAsPhysical: customer.billingSameAsPhysical !== false,
    billingAddressLine1: String(customer.billingAddressLine1 ?? ''),
    billingAddressLine2: String(customer.billingAddressLine2 ?? ''),
    billingCity: String(customer.billingCity ?? ''),
    billingState: String(customer.billingState ?? ''),
    billingPostalCode: String(customer.billingPostalCode ?? ''),
    mailingSameAsBilling: customer.mailingSameAsBilling !== false,
    mailingAddressLine1: String(customer.mailingAddressLine1 ?? ''),
    mailingAddressLine2: String(customer.mailingAddressLine2 ?? ''),
    mailingCity: String(customer.mailingCity ?? ''),
    mailingState: String(customer.mailingState ?? ''),
    mailingPostalCode: String(customer.mailingPostalCode ?? ''),
    addressLine1: String(primary?.addressLine1 ?? ''),
    addressLine2: String(primary?.addressLine2 ?? ''),
    city: String(primary?.city ?? ''),
    state: String(primary?.state ?? ''),
    postalCode: String(primary?.postalCode ?? ''),
    gateCodesInstructions: String(primary?.installNotes ?? primary?.gateCode ?? primary?.accessInstructions ?? ''),
  };
}
