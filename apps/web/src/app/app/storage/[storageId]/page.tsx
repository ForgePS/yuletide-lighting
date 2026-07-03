'use client';

import { useParams } from 'next/navigation';
import { StorageRecordDetail } from '@/components/storage';

export default function StorageRecordPage() {
  const recordId = useParams().storageId as string;
  return <StorageRecordDetail recordId={recordId} />;
}
