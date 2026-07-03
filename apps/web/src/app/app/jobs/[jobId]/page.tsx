import { JobDetail } from '@/components/jobs';

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <JobDetail jobId={jobId} />;
}
