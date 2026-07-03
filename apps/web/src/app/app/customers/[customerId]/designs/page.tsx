'use client';

import { useParams } from 'next/navigation';
import { DesignHistory } from '@/components/customers';

export default function CustomerDesignsPage() {
  const customerId = useParams().customerId as string;
  return <DesignHistory customerId={customerId} />;
}
