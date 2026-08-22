'use client';

import { CreatorConsolePage } from '@/components/creator';

/** Website CMS lives inside CreatorConsole (tab + dedicated route). */
export default function CreatorWebsitePage() {
  return <CreatorConsolePage initialTab="website" />;
}
