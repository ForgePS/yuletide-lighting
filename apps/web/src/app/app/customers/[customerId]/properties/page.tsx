'use client';

import { useParams } from 'next/navigation';
import { PropertyList } from '@/components/customers';

export default function CustomerPropertiesPage() {
  const customerId = useParams().customerId as string;
  return <PropertyList customerId={customerId} />;
}
