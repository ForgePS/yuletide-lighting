'use client';

import { useParams } from 'next/navigation';
import { StorageInventory } from '@/components/customers';

export default function CustomerStoragePage() {
  const customerId = useParams().customerId as string;
  return <StorageInventory customerId={customerId} />;
}
