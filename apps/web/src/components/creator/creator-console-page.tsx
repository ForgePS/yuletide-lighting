'use client';

import { CreatorConsole, type CreatorConsoleTab } from './creator-console';
import { tabFromPath } from './creator-shell';
import { usePathname } from 'next/navigation';

export function CreatorConsolePage({ initialTab }: { initialTab?: CreatorConsoleTab }) {
  const pathname = usePathname();
  const tab = initialTab ?? tabFromPath(pathname);
  return <CreatorConsole initialTab={tab} />;
}
