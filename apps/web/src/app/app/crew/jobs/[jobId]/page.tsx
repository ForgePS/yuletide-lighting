'use client';

import { useParams } from 'next/navigation';
import { CrewJobDetail } from '@/components/crew';

export default function CrewJobPage() {
  const jobId = useParams().jobId as string;
  return <CrewJobDetail jobId={jobId} />;
}
