'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExitAdminPage() {
  const router = useRouter();

  useEffect(() => {
    try {
      localStorage.removeItem('tinacms-auth');
      localStorage.removeItem('tina:auth');
      for (const key of Object.keys(localStorage)) {
        if (key.toLowerCase().includes('tina')) localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
    router.replace('/');
  }, [router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Signing out of Tina…
    </div>
  );
}
