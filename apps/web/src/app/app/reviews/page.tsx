import { ReviewsHub } from '@/components/reviews';

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reviews & referrals</h1>
        <p className="text-muted-foreground">
          Track review requests after install, capture internal feedback, and manage referral rewards.
        </p>
      </div>
      <ReviewsHub />
    </div>
  );
}
