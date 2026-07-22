'use client';

import Link from 'next/link';
import { WebsiteCmsHub } from '@/components/cms/website-cms-hub';
import { trpc } from '@/lib/trpc';

export default function AppWebsitePage() {
  const { data, isLoading, isError } = trpc.creator360.checkAccess.useQuery(undefined, {
    retry: false,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Checking access…</p>;
  }

  if (isError || !data?.allowed) {
    return (
      <div className="card max-w-xl space-y-3 p-6">
        <h1 className="text-xl font-bold">Website CMS</h1>
        <p className="text-sm text-muted-foreground">
          Creator access is required. In local development, leave{' '}
          <code className="text-xs">PLATFORM_CREATOR_EMAILS</code> empty (all signed-in users get
          access), or set it to your email in the repo root <code className="text-xs">.env</code> and
          restart the server.
        </p>
        <Link href="/creator" className="btn-primary inline-flex">
          Open Creator Console
        </Link>
      </div>
    );
  }

  return <WebsiteCmsHub />;
}
