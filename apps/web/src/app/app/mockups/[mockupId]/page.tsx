import { MockupStudio } from '@/components/mockups';

export default async function Page({ params }: { params: Promise<{ mockupId: string }> }) {
  const { mockupId } = await params;
  return <MockupStudio mockupId={mockupId} />;
}
