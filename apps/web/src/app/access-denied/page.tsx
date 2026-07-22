import Link from 'next/link';

const REASONS: Record<string, { title: string; body: string }> = {
  inactive: {
    title: 'Account inactive',
    body: 'Your user account has been suspended or archived. Contact your organization administrator.',
  },
  pending: {
    title: 'Invitation pending',
    body: 'Your account invitation has not been accepted yet. Check your email or ask an admin to resend the invite.',
  },
  no_account: {
    title: 'No organization membership',
    body: 'You are signed in, but you are not a member of an organization. Ask an admin to invite you, or complete sign-up.',
  },
  no_org: {
    title: 'Organization unavailable',
    body: 'Your organization record could not be loaded. Contact support or your administrator.',
  },
  forbidden: {
    title: 'Access denied',
    body: 'You do not have permission to view this page.',
  },
  unauthenticated: {
    title: 'Sign in required',
    body: 'Your session is missing or expired.',
  },
};

export default async function AccessDeniedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const reason = params.reason ?? 'forbidden';
  const copy = REASONS[reason] ?? REASONS.forbidden!;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Yuletide CRM</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{copy.body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/sign-in" className="btn-primary">
            Sign in
          </Link>
          <Link href="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
