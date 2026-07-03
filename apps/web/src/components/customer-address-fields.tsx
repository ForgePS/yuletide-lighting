'use client';

export type CustomerAddressFormState = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  gateCodesInstructions: string;
  billingSameAsPhysical: boolean;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
};

export const emptyCustomerAddressForm: CustomerAddressFormState = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  gateCodesInstructions: '',
  billingSameAsPhysical: true,
  billingAddressLine1: '',
  billingAddressLine2: '',
  billingCity: '',
  billingState: '',
  billingPostalCode: '',
};

type CustomerAddressFieldsProps = {
  value: CustomerAddressFormState;
  onChange: (value: CustomerAddressFormState) => void;
  requireAddress?: boolean;
};

export function CustomerAddressFields({
  value,
  onChange,
  requireAddress = true,
}: CustomerAddressFieldsProps) {
  function set<K extends keyof CustomerAddressFormState>(key: K, fieldValue: CustomerAddressFormState[K]) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className="space-y-6">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Service address</legend>
        <input
          required={requireAddress}
          placeholder="Street address"
          value={value.addressLine1}
          onChange={(e) => set('addressLine1', e.target.value)}
          className="input"
        />
        <input
          placeholder="Apt, suite, unit (optional)"
          value={value.addressLine2}
          onChange={(e) => set('addressLine2', e.target.value)}
          className="input"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <input
            required={requireAddress}
            placeholder="City"
            value={value.city}
            onChange={(e) => set('city', e.target.value)}
            className="input"
          />
          <input
            required={requireAddress}
            placeholder="State"
            value={value.state}
            onChange={(e) => set('state', e.target.value)}
            className="input"
          />
          <input
            required={requireAddress}
            placeholder="ZIP code"
            value={value.postalCode}
            onChange={(e) => set('postalCode', e.target.value)}
            className="input"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">Gate codes & access instructions</legend>
        <textarea
          placeholder="Gate code, keypad entry, dog in yard, best time to access, etc."
          value={value.gateCodesInstructions}
          onChange={(e) => set('gateCodesInstructions', e.target.value)}
          className="input min-h-[88px] resize-y"
          rows={3}
        />
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-foreground">Billing address</legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={value.billingSameAsPhysical}
            onChange={(e) => set('billingSameAsPhysical', e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
          />
          Billing address is the same as service address
        </label>

        {!value.billingSameAsPhysical && (
          <div className="space-y-4 border-l-2 border-primary/20 pl-4">
            <input
              required
              placeholder="Billing street address"
              value={value.billingAddressLine1}
              onChange={(e) => set('billingAddressLine1', e.target.value)}
              className="input"
            />
            <input
              placeholder="Apt, suite, unit (optional)"
              value={value.billingAddressLine2}
              onChange={(e) => set('billingAddressLine2', e.target.value)}
              className="input"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <input
                required
                placeholder="City"
                value={value.billingCity}
                onChange={(e) => set('billingCity', e.target.value)}
                className="input"
              />
              <input
                required
                placeholder="State"
                value={value.billingState}
                onChange={(e) => set('billingState', e.target.value)}
                className="input"
              />
              <input
                required
                placeholder="ZIP code"
                value={value.billingPostalCode}
                onChange={(e) => set('billingPostalCode', e.target.value)}
                className="input"
              />
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}

export function formatServiceAddress(property?: {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
} | null) {
  if (!property) return '—';
  const line2 = property.addressLine2 ? `, ${property.addressLine2}` : '';
  return `${property.addressLine1}${line2}, ${property.city}, ${property.state} ${property.postalCode}`;
}

export function formatBillingAddress(customer: {
  billingSameAsPhysical?: boolean;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  primaryProperty?: {
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
  } | null;
}) {
  if (customer.billingSameAsPhysical !== false && customer.primaryProperty) {
    return formatServiceAddress(customer.primaryProperty);
  }
  if (!customer.billingAddressLine1) return '—';
  const line2 = customer.billingAddressLine2 ? `, ${customer.billingAddressLine2}` : '';
  return `${customer.billingAddressLine1}${line2}, ${customer.billingCity}, ${customer.billingState} ${customer.billingPostalCode}`;
}
