'use client';

import { useParams } from 'next/navigation';
import { PortalJobDetailPage } from '@/components/portal/pages/jobs/job-detail';

export default function Page() {
  const jobId = useParams().jobId as string;
  return <PortalJobDetailPage jobId={jobId} />;
}
