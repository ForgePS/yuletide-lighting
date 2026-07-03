'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { logoDisplayUrl } from '@clcrm/types';
import { useAuth } from '@/lib/firebase-auth';

export function AuthenticatedImage({
  value,
  alt,
  className,
  fallback,
}: {
  value: string | null | undefined;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const { idToken } = useAuth();
  const src = logoDisplayUrl(value);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) {
      setDisplaySrc(null);
      setFailed(false);
      return;
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
      setDisplaySrc(src);
      setFailed(false);
      return;
    }

    if (!idToken) return;

    let cancelled = false;
    let blobUrl: string | null = null;

    (async () => {
      try {
        const res = await fetch(src, {
          credentials: 'include',
          headers: { authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (cancelled) return;
        blobUrl = URL.createObjectURL(blob);
        setDisplaySrc(blobUrl);
        setFailed(false);
      } catch {
        if (!cancelled) {
          setDisplaySrc(null);
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src, idToken]);

  if (!src || failed) return fallback ?? null;
  if (!displaySrc) {
    return (
      fallback ?? (
        <div className="flex h-16 w-40 animate-pulse items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
          Loading...
        </div>
      )
    );
  }

  return <img src={displaySrc} alt={alt} className={className} />;
}
