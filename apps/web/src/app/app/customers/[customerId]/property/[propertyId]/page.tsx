'use client';

import { useParams } from 'next/navigation';
import { PropertyProfileDetail } from '@/components/properties/property-profile-detail';

export default function CustomerPropertyProfilePage() {
  const params = useParams();
  const customerId = params.customerId as string;
  const propertyId = params.propertyId as string;
  return <PropertyProfileDetail customerId={customerId} propertyId={propertyId} />;
}
