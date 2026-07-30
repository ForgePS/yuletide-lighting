import { SignCampaignReport } from '@/components/sign-tracker';

export default function SignReportPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold">Sign Campaign Report</h2>
      <p className="mt-1 text-sm text-muted-foreground">Season performance, recovery rates, and replacement cost estimates.</p>
      <div className="mt-6">
        <SignCampaignReport />
      </div>
    </div>
  );
}
