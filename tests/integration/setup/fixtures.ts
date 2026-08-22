export function sampleCustomerInput(overrides?: Record<string, unknown>) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '555-0100',
    tags: [] as string[],
    smsOptIn: true,
    emailOptIn: true,
    billingSameAsPhysical: true,
    addressLine1: '100 Light Lane',
    city: 'Festive',
    state: 'TX',
    postalCode: '75001',
    ...overrides,
  };
}

export function sampleSignLocationInput(overrides?: Record<string, unknown>) {
  return {
    seasonYear: 2026,
    location: {
      latitude: 32.7767,
      longitude: -96.797,
      address: '100 Light Lane',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      neighborhood: 'Downtown',
    },
    quantityPlaced: 2,
    placementType: 'customer_yard' as const,
    notes: 'Corner lot',
    ...overrides,
  };
}
