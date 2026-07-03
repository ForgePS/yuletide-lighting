'use client';

import { useParams } from 'next/navigation';
import { JobHistory } from '@/components/customers';

export default function CustomerJobsPage() {
  const customerId = useParams().customerId as string;
  return <JobHistory customerId={customerId} />;
}
