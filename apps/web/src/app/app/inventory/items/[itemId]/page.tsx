'use client';

import { useParams } from 'next/navigation';
import { InventoryItemDetail } from '@/components/inventory';

export default function InventoryItemPage() {
  const itemId = useParams().itemId as string;
  return <InventoryItemDetail itemId={itemId} />;
}
