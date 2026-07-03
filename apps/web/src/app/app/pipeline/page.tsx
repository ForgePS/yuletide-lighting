'use client';

import { PipelineBoard } from '@/components/pipeline/pipeline-board';

export default function PipelinePage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pipeline</h1>
        <p className="page-subtitle">
          Track every customer from new lead through install, removal, storage, and rebooking.
        </p>
      </div>
      <PipelineBoard />
    </div>
  );
}
