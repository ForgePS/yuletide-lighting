'use client';

import { useParams } from 'next/navigation';
import { CommercialAccountDetail } from '@/components/commercial';

export default function CommercialAccountPage() {
  const accountId = useParams().accountId as string;
  return <CommercialAccountDetail accountId={accountId} />;
}
