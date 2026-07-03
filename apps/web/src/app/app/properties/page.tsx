'use client';

import { PropertiesHub } from '@/components/properties/properties-hub';

export default function PropertiesPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Properties</h1>
        <p className="page-subtitle">
          Site profiles with roofline details, access notes, photos, and install complexity for faster estimates.
        </p>
      </div>
      <PropertiesHub />
    </div>
  );
}
