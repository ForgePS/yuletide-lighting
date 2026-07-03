import { PaymentHistory, RecordPaymentForm } from '@/components/invoices';

export default function Page() {
  return (
    <div className="space-y-8">
      <RecordPaymentForm />
      <PaymentHistory />
    </div>
  );
}
