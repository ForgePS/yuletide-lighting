'use client';

import { useParams } from 'next/navigation';
import { CommunicationHub } from '@/components/customers';

export default function CustomerCommunicationsPage() {
  const customerId = useParams().customerId as string;
  return <CommunicationHub customerId={customerId} />;
}
