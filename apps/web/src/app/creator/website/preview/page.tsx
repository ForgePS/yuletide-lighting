'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CmsPageView } from '@/components/cms/cms-page-view';
import { TRPCProvider, trpc } from '@/lib/trpc';
import { applyCmsLocale } from '@/lib/cms-runtime';
import { LoadingState } from '@/components/ui/states';

function CmsPreviewInner() {
  const params = useSearchParams();
  const pageId = params.get('pageId') || '';
  const locale = params.get('lang');
  const editMode = params.get('cmsEdit') === '1';

  const { data: page, isLoading } = trpc.websiteCms.pages.get.useQuery(
    { id: pageId },
    { enabled: !!pageId },
  );
  const { data: globals } = trpc.websiteCms.globals.get.useQuery();

  const localized = useMemo(
    () => (page ? applyCmsLocale(page, locale) : null),
    [page, locale],
  );

  if (!pageId) {
    return <p className="p-6 text-sm text-muted-foreground">Missing pageId</p>;
  }
  if (isLoading || !localized || !globals) return <LoadingState />;

  return (
    <CmsPageView
      page={localized}
      globals={globals}
      editMode={editMode}
      locale={locale}
    />
  );
}

export default function CmsPreviewPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;
  return (
    <TRPCProvider>
      <Suspense fallback={<LoadingState />}>
        <CmsPreviewInner />
      </Suspense>
    </TRPCProvider>
  );
}
