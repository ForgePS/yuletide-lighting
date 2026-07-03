import { CreatorOrganizationDetailPage } from '@/components/creator';

export default async function Page({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return <CreatorOrganizationDetailPage orgId={orgId} />;
}
