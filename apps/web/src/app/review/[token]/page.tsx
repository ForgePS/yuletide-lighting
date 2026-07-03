'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { LoadingState, ErrorState } from '@/components/ui/states';

export default function PublicReviewPage() {
  const token = useParams().token as string;
  const { data, isLoading, isError, refetch } = trpc.reviews360.public.getByToken.useQuery({ token });
  const submit = trpc.reviews360.public.submitFeedback.useMutation({ onSuccess: () => refetch() });

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [result, setResult] = useState<{ route: string; googleReviewUrl?: string | null; message: string } | null>(null);

  if (isLoading) return <LoadingState message="Loading..." />;
  if (isError || !data) return <ErrorState message="Review link not found or expired." />;

  const { organization, customerName, alreadySubmitted } = data;
  const brand = organization.brandColor ?? '#DC2626';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return;
    const res = await submit.mutateAsync({ token, rating, feedback: feedback || undefined });
    setResult(res);
  }

  if (alreadySubmitted || result) {
    const showGoogle = result?.route === 'google' || data.reviewRequest.status === 'submitted';
    const googleUrl = result?.googleReviewUrl;
    return (
      <div className="mesh-bg flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md p-8 text-center shadow-soft">
          <h1 className="text-xl font-bold" style={{ color: brand }}>
            {organization.companyName}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {result?.message ?? 'Thank you for your feedback!'}
          </p>
          {showGoogle && googleUrl && (
            <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-6 inline-block">
              Leave a Google review
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md p-8 shadow-soft">
        <div className="text-center">
          {organization.logoUrl && (
            <img src={organization.logoUrl} alt="" className="mx-auto mb-4 h-12 object-contain" />
          )}
          <h1 className="text-xl font-bold" style={{ color: brand }}>
            {organization.companyName}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Hi{customerName ? ` ${customerName.split(' ')[0]}` : ''}! How was your lighting install?
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <p className="mb-3 text-center text-sm font-medium">Rate your experience</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`flex h-12 w-12 items-center justify-center rounded-full text-lg transition-all ${
                    rating >= n ? 'bg-amber-400 text-white scale-110' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  aria-label={`${n} star${n === 1 ? '' : 's'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {rating > 0 && rating < 4 && (
            <div>
              <label className="text-sm font-medium">Tell us what we can improve</label>
              <textarea
                className="input mt-2 min-h-[100px] w-full"
                placeholder="Your feedback helps us serve you better..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">Low ratings are handled privately by our team.</p>
            </div>
          )}

          {rating >= 4 && (
            <p className="text-center text-sm text-muted-foreground">
              Glad you loved it! Next we&apos;ll send you to Google to share your experience.
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={rating < 1 || submit.isPending}>
            {rating >= 4 ? 'Continue to Google review' : 'Submit feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
