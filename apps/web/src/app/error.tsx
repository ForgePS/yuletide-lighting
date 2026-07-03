'use client';

import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-muted/40 p-6 font-sans">
        <div className="card max-w-md p-8 text-center shadow-soft">
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page hit an unexpected error. Try refreshing, or sign in again.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={() => reset()} className="btn-primary">
              Try again
            </button>
            <Link href="/sign-in" className="btn-secondary">
              Go to sign in
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
