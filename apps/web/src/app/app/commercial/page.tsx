import { CommercialDashboard } from '@/components/commercial';

export default function CommercialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commercial accounts</h1>
        <p className="text-muted-foreground">
          Manage multi-site clients — parent accounts, child locations, shared billing, and multi-location proposals.
        </p>
      </div>
      <CommercialDashboard />
    </div>
  );
}
