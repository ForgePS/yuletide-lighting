import type { MetadataRoute } from 'next';
import { listCmsPages } from '@yuletide/firebase';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://yuletide-lighting.web.app';
  try {
    const pages = await listCmsPages();
    return pages
      .filter((p) => p.status === 'published')
      .map((p) => ({
        url: p.slug === 'home' ? `${base}/` : `${base}/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly' as const,
      }));
  } catch {
    return [
      { url: `${base}/`, changeFrequency: 'weekly' },
      { url: `${base}/pricing`, changeFrequency: 'weekly' },
    ];
  }
}
