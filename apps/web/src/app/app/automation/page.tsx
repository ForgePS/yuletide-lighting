import { AutomationHub } from '@/components/automation';

export default function AutomationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Automation center</h1>
        <p className="text-muted-foreground">
          Workflow rules for leads, proposals, jobs, invoices, storage, and rebooking — with full run history.
        </p>
      </div>
      <AutomationHub />
    </div>
  );
}
