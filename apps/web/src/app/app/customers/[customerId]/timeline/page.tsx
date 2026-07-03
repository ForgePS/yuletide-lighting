'use client';

import { useParams } from 'next/navigation';
import { ActivityTimeline } from '@/components/customers';

export default function CustomerTimelinePage() {
  const customerId = useParams().customerId as string;
  return <ActivityTimeline customerId={customerId} />;
}
