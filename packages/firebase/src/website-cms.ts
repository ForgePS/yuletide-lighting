import type { DocumentData } from 'firebase-admin/firestore';
import type {
  CmsBrokenLinkItem,
  CmsLinkCheckReport,
  CmsNamedFooter,
  CmsPage,
  CmsPageSummary,
  CmsPageVersion,
  CmsSavedSection,
  CmsSiteGlobals,
} from '@clcrm/types';
import {
  buildDefaultHomePage,
  buildDefaultPricingPage,
  buildDefaultSiteGlobals,
  createCmsId,
  DEFAULT_FOOTER,
} from '@clcrm/types';
import { getAdminFirestore, Timestamp } from './admin';
import { mapTimestampsFromData, stripUndefined } from './firestore-utils';

function ts() {
  return Timestamp.now();
}

function refs() {
  const db = getAdminFirestore();
  const website = db.collection('platform').doc('website');
  return {
    pages: website.collection('pages'),
    page: (id: string) => website.collection('pages').doc(id),
    globals: website.collection('globals').doc('site'),
    versions: website.collection('versions'),
    version: (id: string) => website.collection('versions').doc(id),
    sections: website.collection('sections'),
    section: (id: string) => website.collection('sections').doc(id),
    footers: website.collection('footers'),
    footer: (id: string) => website.collection('footers').doc(id),
    linkReport: website.collection('linkReports').doc('latest'),
  };
}

function mapPage(id: string, data: DocumentData): CmsPage {
  const mapped = mapTimestampsFromData(data) as Record<string, unknown>;
  if (data.publishedAt && typeof data.publishedAt.toDate === 'function') {
    mapped.publishedAt = data.publishedAt.toDate();
  }
  if (data.scheduledPublishAt && typeof data.scheduledPublishAt.toDate === 'function') {
    mapped.scheduledPublishAt = data.scheduledPublishAt.toDate();
  }
  return { id, ...(mapped as Omit<CmsPage, 'id'>) };
}

let seedPromise: Promise<void> | null = null;
let seedFailedPermanently = false;

export async function ensureWebsiteCmsSeeded() {
  if (seedFailedPermanently) return;
  if (!seedPromise) {
    seedPromise = (async () => {
      const r = refs();
      const globalsSnap = await r.globals.get();
      if (!globalsSnap.exists) {
        const globals = buildDefaultSiteGlobals();
        await r.globals.set(stripUndefined({ ...globals, updatedAt: ts() } as Record<string, unknown>));
      }

      if (!(await r.page('page_home').get()).exists) {
        const home = buildDefaultHomePage();
        await r.page('page_home').set({
          ...home,
          createdAt: ts(),
          updatedAt: ts(),
          publishedAt: ts(),
        });
      }

      if (!(await r.page('page_pricing').get()).exists) {
        const pricing = buildDefaultPricingPage();
        await r.page('page_pricing').set({
          ...pricing,
          createdAt: ts(),
          updatedAt: ts(),
          publishedAt: ts(),
        });
      }
    })().catch((err) => {
      seedPromise = null;
      const msg = err instanceof Error ? err.message : String(err);
      if (/PERMISSION_DENIED|Missing or insufficient permissions/i.test(msg)) {
        seedFailedPermanently = true;
      }
      throw err;
    });
  }
  await seedPromise;
}

async function readGlobalsOnly(): Promise<CmsSiteGlobals> {
  const snap = await refs().globals.get();
  if (!snap.exists) return buildDefaultSiteGlobals();
  return mapTimestampsFromData(snap.data()!) as CmsSiteGlobals;
}

async function readPageBySlugOnly(
  slug: string,
  opts?: { includeDrafts?: boolean },
): Promise<CmsPage | null> {
  // Known default pages — direct doc read is faster than a query.
  const knownId = slug === 'home' ? 'page_home' : slug === 'pricing' ? 'page_pricing' : null;
  if (knownId) {
    const direct = await refs().page(knownId).get();
    if (direct.exists) {
      const page = mapPage(direct.id, direct.data()!);
      if (page.slug === slug) {
        if (!opts?.includeDrafts && page.status !== 'published') {
          if (
            page.status === 'scheduled' &&
            page.scheduledPublishAt &&
            page.scheduledPublishAt <= new Date()
          ) {
            return page;
          }
          return null;
        }
        return page;
      }
    }
  }

  const snap = await refs().pages.where('slug', '==', slug).limit(1).get();
  if (snap.empty) return null;
  const page = mapPage(snap.docs[0]!.id, snap.docs[0]!.data());
  if (!opts?.includeDrafts && page.status !== 'published') {
    if (
      page.status === 'scheduled' &&
      page.scheduledPublishAt &&
      page.scheduledPublishAt <= new Date()
    ) {
      return page;
    }
    return null;
  }
  return page;
}

export async function getSiteGlobals(): Promise<CmsSiteGlobals> {
  try {
    await ensureWebsiteCmsSeeded();
  } catch {
    /* fall through to read / defaults */
  }
  try {
    return await readGlobalsOnly();
  } catch {
    return buildDefaultSiteGlobals();
  }
}

export async function updateSiteGlobals(
  input: Omit<CmsSiteGlobals, 'updatedAt'>,
  actor: { email: string; userId: string },
): Promise<CmsSiteGlobals> {
  await ensureWebsiteCmsSeeded();
  const next: CmsSiteGlobals = { ...input, updatedAt: new Date() };
  await refs().globals.set({ ...next, updatedAt: ts() }, { merge: true });
  await writeAudit('site_globals_update', actor, { summary: 'Updated site globals' });
  invalidatePublishedCmsCache();
  return next;
}

export async function listCmsPages(): Promise<CmsPageSummary[]> {
  await ensureWebsiteCmsSeeded();
  const snap = await refs().pages.get();
  return snap.docs
    .map((doc) => {
      const page = mapPage(doc.id, doc.data());
      return {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        updatedAt: page.updatedAt,
        version: page.version,
        blockCount: page.blocks?.length ?? 0,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getCmsPageById(id: string): Promise<CmsPage | null> {
  await ensureWebsiteCmsSeeded();
  const snap = await refs().page(id).get();
  if (!snap.exists) return null;
  return mapPage(snap.id, snap.data()!);
}

export async function getCmsPageBySlug(
  slug: string,
  opts?: { includeDrafts?: boolean },
): Promise<CmsPage | null> {
  try {
    await ensureWebsiteCmsSeeded();
  } catch {
    /* continue to read */
  }
  try {
    return await readPageBySlugOnly(slug, opts);
  } catch {
    return null;
  }
}

let publicCmsDenied = false;
let publicCmsDeniedAt = 0;
const publicBundleCache = new Map<string, { expiresAt: number; page: CmsPage | null; globals: CmsSiteGlobals }>();
/** Keep short — Creator saves invalidate immediately; TTL is only a safety net. */
const PUBLIC_BUNDLE_TTL_MS = 15_000;
const PUBLIC_CMS_DENY_TTL_MS = 60_000;
const PUBLIC_CMS_READ_TIMEOUT_MS = 1500;

/** Clear in-process public CMS cache after Creator writes (all SSR instances that receive the write). */
export function invalidatePublishedCmsCache(slug?: string) {
  publicCmsDenied = false;
  if (!slug) {
    publicBundleCache.clear();
    return;
  }
  publicBundleCache.delete(slug);
  // Globals live inside every slug bundle — clear all when branding/chrome changes.
  if (slug === '*globals*') {
    publicBundleCache.clear();
  }
}

export async function getPublishedPageBundle(slug: string) {
  const cached = publicBundleCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) {
    return { page: cached.page, globals: cached.globals };
  }
  if (publicCmsDenied && Date.now() - publicCmsDeniedAt < PUBLIC_CMS_DENY_TTL_MS) {
    return { page: null, globals: buildDefaultSiteGlobals() };
  }
  publicCmsDenied = false;

  // Soft timeout so broken Admin credentials don't hang SSR
  try {
    const [page, globals] = await Promise.race([
      Promise.all([readPageBySlugOnly(slug), readGlobalsOnly()]),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('CMS public read timeout')), PUBLIC_CMS_READ_TIMEOUT_MS);
      }),
    ]);
    if (!page && (slug === 'home' || slug === 'pricing')) {
      // Never block the request on seeding — warm in background.
      void ensureWebsiteCmsSeeded().catch(() => {});
    }
    let resolvedGlobals = globals;
    if (page?.footerId) {
      try {
        const named = await getNamedFooter(page.footerId);
        if (named) {
          resolvedGlobals = { ...globals, footer: named.footer };
        }
      } catch {
        /* keep default footer */
      }
    }
    publicBundleCache.set(slug, {
      page,
      globals: resolvedGlobals,
      expiresAt: Date.now() + PUBLIC_BUNDLE_TTL_MS,
    });
    return { page, globals: resolvedGlobals };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/PERMISSION_DENIED|Missing or insufficient permissions/i.test(msg)) {
      publicCmsDenied = true;
      publicCmsDeniedAt = Date.now();
    }
    void ensureWebsiteCmsSeeded().catch(() => {});
    const fallback = { page: null, globals: buildDefaultSiteGlobals() };
    // Cache misses briefly so cold-start timeouts don't hammer Firestore.
    publicBundleCache.set(slug, {
      ...fallback,
      expiresAt: Date.now() + 10_000,
    });
    return fallback;
  }
}

async function saveVersion(
  page: CmsPage,
  actor: { email: string; userId: string },
  summary: string,
) {
  const id = `v_${page.id}_${page.version}_${Date.now()}`;
  const version: CmsPageVersion = {
    id,
    pageId: page.id,
    version: page.version,
    summary,
    snapshot: page,
    createdAt: new Date(),
    createdByEmail: actor.email,
    createdByUserId: actor.userId,
  };
  await refs().version(id).set({
    ...version,
    createdAt: ts(),
    snapshot: {
      ...page,
      createdAt: page.createdAt instanceof Date ? Timestamp.fromDate(page.createdAt) : ts(),
      updatedAt: ts(),
      publishedAt: page.publishedAt ? Timestamp.fromDate(page.publishedAt) : null,
    },
  });
}

async function writeAudit(
  action: string,
  actor: { email: string; userId: string },
  details: Record<string, unknown>,
) {
  await getAdminFirestore().collection('platformAuditLogs').add({
    action,
    actorEmail: actor.email,
    actorUserId: actor.userId,
    details,
    createdAt: ts(),
  });
}

export async function createCmsPage(
  input: { title: string; slug: string; duplicateFromId?: string },
  actor: { email: string; userId: string },
): Promise<CmsPage> {
  await ensureWebsiteCmsSeeded();
  const r = refs();
  const existing = await r.pages.where('slug', '==', input.slug).limit(1).get();
  if (!existing.empty) {
    throw new Error(`A page with slug "${input.slug}" already exists`);
  }

  let blocks: CmsPage['blocks'] = [];
  let seo: CmsPage['seo'] = {
    title: input.title,
    description: '',
    slug: input.slug,
    includeInSitemap: true,
  };

  if (input.duplicateFromId) {
    const source = await getCmsPageById(input.duplicateFromId);
    if (source) {
      blocks = JSON.parse(JSON.stringify(source.blocks)) as CmsPage['blocks'];
      seo = { ...source.seo, slug: input.slug, title: input.title };
    }
  }

  const id = `page_${input.slug.replace(/-/g, '_')}`;
  const now = new Date();
  const page: CmsPage = {
    id,
    title: input.title,
    slug: input.slug,
    status: 'draft',
    blocks,
    seo,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    version: 1,
  };

  await r.page(id).set({
    ...page,
    createdAt: ts(),
    updatedAt: ts(),
    publishedAt: null,
  });
  await saveVersion(page, actor, 'Created page');
  await writeAudit('cms_page_create', actor, { pageId: id, slug: input.slug });
  invalidatePublishedCmsCache(input.slug);
  return page;
}

export async function updateCmsPage(
  input: {
    id: string;
    title: string;
    slug: string;
    status: CmsPage['status'];
    blocks: CmsPage['blocks'];
    seo: CmsPage['seo'];
    scheduledPublishAt?: Date | null;
    footerId?: string | null;
    blockOrderByBreakpoint?: CmsPage['blockOrderByBreakpoint'];
    locale?: string;
    translations?: CmsPage['translations'];
    changeSummary?: string;
  },
  actor: { email: string; userId: string },
): Promise<CmsPage> {
  await ensureWebsiteCmsSeeded();
  const existing = await getCmsPageById(input.id);
  if (!existing) throw new Error('Page not found');

  const slugClash = await refs().pages.where('slug', '==', input.slug).limit(2).get();
  if (slugClash.docs.some((d) => d.id !== input.id)) {
    throw new Error(`A page with slug "${input.slug}" already exists`);
  }

  const version = existing.version + 1;
  const now = new Date();
  const publishedAt =
    input.status === 'published' ? (existing.publishedAt ?? now) : (existing.publishedAt ?? null);

  const page: CmsPage = {
    ...existing,
    title: input.title,
    slug: input.slug,
    status: input.status,
    blocks: input.blocks,
    seo: { ...input.seo, slug: input.slug },
    scheduledPublishAt: input.scheduledPublishAt ?? null,
    footerId: input.footerId !== undefined ? input.footerId : (existing.footerId ?? null),
    blockOrderByBreakpoint:
      input.blockOrderByBreakpoint !== undefined
        ? input.blockOrderByBreakpoint
        : (existing.blockOrderByBreakpoint ?? null),
    locale: input.locale ?? existing.locale ?? 'en',
    translations:
      input.translations !== undefined ? input.translations : (existing.translations ?? null),
    updatedAt: now,
    publishedAt,
    version,
  };

  await refs()
    .page(input.id)
    .set({
      ...page,
      createdAt: existing.createdAt instanceof Date ? Timestamp.fromDate(existing.createdAt) : ts(),
      updatedAt: ts(),
      publishedAt: publishedAt ? Timestamp.fromDate(publishedAt) : null,
      scheduledPublishAt: input.scheduledPublishAt
        ? Timestamp.fromDate(input.scheduledPublishAt)
        : null,
    });

  await saveVersion(page, actor, input.changeSummary ?? `Updated to v${version}`);
  await writeAudit('cms_page_update', actor, {
    pageId: input.id,
    version,
    status: input.status,
  });
  invalidatePublishedCmsCache(existing.slug);
  if (existing.slug !== input.slug) invalidatePublishedCmsCache(input.slug);
  return page;
}

export async function deleteCmsPage(
  id: string,
  actor: { email: string; userId: string },
): Promise<void> {
  if (id === 'page_home' || id === 'page_pricing') {
    throw new Error('Cannot delete the Home or Pricing system pages. Unpublish or archive instead.');
  }
  const existing = await getCmsPageById(id);
  if (!existing) throw new Error('Page not found');
  await refs().page(id).delete();
  await writeAudit('cms_page_delete', actor, { pageId: id, slug: existing.slug });
  invalidatePublishedCmsCache(existing.slug);
}

export async function listCmsPageVersions(pageId: string, limit = 20): Promise<CmsPageVersion[]> {
  const snap = await refs().versions.where('pageId', '==', pageId).get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        pageId: data.pageId as string,
        version: data.version as number,
        summary: data.summary as string,
        snapshot: mapPage(
          (data.snapshot?.id as string) ?? pageId,
          (data.snapshot as DocumentData) ?? {},
        ),
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        createdByEmail: data.createdByEmail as string,
        createdByUserId: data.createdByUserId as string,
      };
    })
    .sort((a, b) => b.version - a.version)
    .slice(0, limit);
}

export async function restoreCmsPageVersion(
  versionId: string,
  actor: { email: string; userId: string },
): Promise<CmsPage> {
  const snap = await refs().version(versionId).get();
  if (!snap.exists) throw new Error('Version not found');
  const data = snap.data()!;
  const snapshot = mapPage(
    (data.snapshot?.id as string) ?? (data.pageId as string),
    (data.snapshot as DocumentData) ?? {},
  );
  return updateCmsPage(
    {
      id: snapshot.id,
      title: snapshot.title,
      slug: snapshot.slug,
      status: snapshot.status,
      blocks: snapshot.blocks,
      seo: snapshot.seo,
      scheduledPublishAt: snapshot.scheduledPublishAt ?? null,
      changeSummary: `Restored from version ${data.version}`,
    },
    actor,
  );
}

/**
 * YL-S27 — flip due scheduled CMS pages to published (Inngest cron).
 */
export async function publishDueScheduledCmsPages(): Promise<{ published: number; slugs: string[] }> {
  await ensureWebsiteCmsSeeded();
  const snap = await refs().pages.where('status', '==', 'scheduled').get();
  const now = new Date();
  const slugs: string[] = [];
  const actor = { email: 'system@inngest', userId: 'system' };

  for (const doc of snap.docs) {
    const page = mapPage(doc.id, doc.data());
    if (!page.scheduledPublishAt || page.scheduledPublishAt > now) continue;
    await updateCmsPage(
      {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: 'published',
        blocks: page.blocks,
        seo: page.seo,
        scheduledPublishAt: null,
        changeSummary: 'Auto-published from schedule',
      },
      actor,
    );
    slugs.push(page.slug);
  }
  return { published: slugs.length, slugs };
}

// ——— YL-S28 Saved sections ———

export async function listCmsSavedSections(): Promise<CmsSavedSection[]> {
  await ensureWebsiteCmsSeeded();
  const snap = await refs().sections.get();
  return snap.docs
    .map((doc) => {
      const data = mapTimestampsFromData(doc.data()) as Omit<CmsSavedSection, 'id'>;
      return { id: doc.id, ...data } as CmsSavedSection;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCmsSavedSection(
  input: { name: string; description?: string; blocks: CmsPage['blocks'] },
  actor: { email: string; userId: string },
): Promise<CmsSavedSection> {
  await ensureWebsiteCmsSeeded();
  const id = createCmsId('sec');
  const now = new Date();
  const section: CmsSavedSection = {
    id,
    name: input.name,
    description: input.description,
    blocks: input.blocks,
    createdAt: now,
    updatedAt: now,
    createdByEmail: actor.email,
  };
  await refs().section(id).set({
    ...section,
    createdAt: ts(),
    updatedAt: ts(),
  });
  await writeAudit('cms_section_create', actor, { sectionId: id, name: input.name });
  return section;
}

export async function updateCmsSavedSection(
  input: { id: string; name: string; description?: string; blocks: CmsPage['blocks'] },
  actor: { email: string; userId: string },
): Promise<CmsSavedSection> {
  await ensureWebsiteCmsSeeded();
  const snap = await refs().section(input.id).get();
  if (!snap.exists) throw new Error('Section not found');
  const existing = mapTimestampsFromData(snap.data()!) as Omit<CmsSavedSection, 'id'>;
  const section: CmsSavedSection = {
    id: input.id,
    name: input.name,
    description: input.description,
    blocks: input.blocks,
    createdAt: (existing.createdAt as Date) ?? new Date(),
    updatedAt: new Date(),
    createdByEmail: existing.createdByEmail,
  };
  await refs().section(input.id).set({
    ...section,
    createdAt:
      existing.createdAt instanceof Date ? Timestamp.fromDate(existing.createdAt) : ts(),
    updatedAt: ts(),
  });
  await writeAudit('cms_section_update', actor, { sectionId: input.id });
  return section;
}

export async function deleteCmsSavedSection(
  id: string,
  actor: { email: string; userId: string },
): Promise<void> {
  await refs().section(id).delete();
  await writeAudit('cms_section_delete', actor, { sectionId: id });
}

// ——— YL-S28 Named footers ———

export async function listNamedFooters(): Promise<CmsNamedFooter[]> {
  await ensureWebsiteCmsSeeded();
  const snap = await refs().footers.get();
  return snap.docs
    .map((doc) => {
      const data = mapTimestampsFromData(doc.data()) as Omit<CmsNamedFooter, 'id'>;
      return { id: doc.id, ...data } as CmsNamedFooter;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getNamedFooter(id: string): Promise<CmsNamedFooter | null> {
  const snap = await refs().footer(id).get();
  if (!snap.exists) return null;
  const data = mapTimestampsFromData(snap.data()!) as Omit<CmsNamedFooter, 'id'>;
  return { id: snap.id, ...data } as CmsNamedFooter;
}

export async function upsertNamedFooter(
  input: { id?: string; name: string; footer: CmsNamedFooter['footer'] },
  actor: { email: string; userId: string },
): Promise<CmsNamedFooter> {
  await ensureWebsiteCmsSeeded();
  const id = input.id || createCmsId('foot');
  const existing = await getNamedFooter(id);
  const now = new Date();
  const named: CmsNamedFooter = {
    id,
    name: input.name,
    footer: input.footer ?? DEFAULT_FOOTER,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await refs().footer(id).set({
    ...named,
    createdAt: existing?.createdAt instanceof Date ? Timestamp.fromDate(existing.createdAt) : ts(),
    updatedAt: ts(),
  });
  await writeAudit(existing ? 'cms_footer_update' : 'cms_footer_create', actor, { footerId: id });
  invalidatePublishedCmsCache('*globals*');
  return named;
}

export async function deleteNamedFooter(
  id: string,
  actor: { email: string; userId: string },
): Promise<void> {
  await refs().footer(id).delete();
  await writeAudit('cms_footer_delete', actor, { footerId: id });
  invalidatePublishedCmsCache('*globals*');
}

// ——— YL-S30 search + broken links ———

function extractSearchText(page: CmsPage): string {
  const parts = [page.title, page.seo.title, page.seo.description, page.slug];
  for (const block of page.blocks) {
    parts.push(JSON.stringify(block));
  }
  return parts.join(' ').toLowerCase();
}

export async function searchPublishedCmsPages(
  query: string,
  limit = 20,
): Promise<Array<{ slug: string; title: string; description: string }>> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  await ensureWebsiteCmsSeeded();
  const snap = await refs().pages.where('status', '==', 'published').get();
  const hits: Array<{ slug: string; title: string; description: string; score: number }> = [];
  for (const doc of snap.docs) {
    const page = mapPage(doc.id, doc.data());
    const hay = extractSearchText(page);
    if (!hay.includes(q)) continue;
    hits.push({
      slug: page.slug,
      title: page.seo.title || page.title,
      description: page.seo.description || '',
      score: hay.indexOf(q),
    });
  }
  return hits
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(({ slug, title, description }) => ({ slug, title, description }));
}

function collectUrlsFromPage(page: CmsPage): Array<{ url: string; source: string }> {
  const out: Array<{ url: string; source: string }> = [];
  const push = (url: unknown, source: string) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
      out.push({ url, source });
    } else if (typeof url === 'string' && url.startsWith('/')) {
      out.push({ url, source });
    }
  };
  push(page.seo.canonicalUrl, `${page.slug}:canonical`);
  push(page.seo.ogImageUrl, `${page.slug}:og`);
  for (const block of page.blocks) {
    const raw = JSON.stringify(block);
    const matches = raw.matchAll(/"(href|src|embedUrl|imageUrl)":"([^"]+)"/g);
    for (const m of matches) {
      push(m[2], `${page.slug}:${block.type}:${m[1]}`);
    }
  }
  return out;
}

async function probeUrl(url: string): Promise<CmsBrokenLinkItem> {
  if (url.startsWith('/')) {
    const pages = await listCmsPages();
    const slug = url === '/' ? 'home' : url.replace(/^\//, '').split('/')[0];
    const exists = pages.some((p) => p.slug === slug && p.status === 'published');
    return {
      url,
      source: 'internal',
      status: exists ? 'ok' : 'broken',
      httpStatus: exists ? 200 : 404,
      detail: exists ? undefined : 'No published CMS page for path',
    };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timer);
    const ok = res.status >= 200 && res.status < 400;
    return {
      url,
      source: 'external',
      status: ok ? 'ok' : 'broken',
      httpStatus: res.status,
    };
  } catch (err) {
    return {
      url,
      source: 'external',
      status: 'error',
      httpStatus: null,
      detail: err instanceof Error ? err.message : 'fetch failed',
    };
  }
}

export async function runCmsBrokenLinkCheck(): Promise<CmsLinkCheckReport> {
  await ensureWebsiteCmsSeeded();
  const pages = await listCmsPages();
  const published = (
    await Promise.all(pages.map(async (p) => getCmsPageById(p.id)))
  ).filter((p): p is CmsPage => !!p && p.status === 'published');

  const globals = await getSiteGlobals();
  const urls: Array<{ url: string; source: string }> = [];
  for (const page of published) urls.push(...collectUrlsFromPage(page));
  for (const item of globals.header.navItems) {
    if (item.href) urls.push({ url: item.href, source: 'header.nav' });
  }
  for (const btn of globals.header.ctaButtons) {
    urls.push({ url: btn.href, source: 'header.cta' });
  }
  for (const col of globals.footer.columns) {
    for (const link of col.links ?? []) {
      urls.push({ url: link.href, source: `footer.${col.id}` });
    }
  }

  const unique = new Map<string, string>();
  for (const u of urls) {
    if (!unique.has(u.url)) unique.set(u.url, u.source);
  }

  const items: CmsBrokenLinkItem[] = [];
  for (const [url, source] of unique) {
    const result = await probeUrl(url);
    items.push({ ...result, source });
  }

  const report: CmsLinkCheckReport = {
    id: 'latest',
    ranAt: new Date(),
    checked: items.length,
    broken: items.filter((i) => i.status === 'broken' || i.status === 'error').length,
    items,
  };

  await refs().linkReport.set({
    ...report,
    ranAt: ts(),
  });
  return report;
}

export async function getCmsLinkCheckReport(): Promise<CmsLinkCheckReport | null> {
  const snap = await refs().linkReport.get();
  if (!snap.exists) return null;
  const data = mapTimestampsFromData(snap.data()!) as Omit<CmsLinkCheckReport, 'id'>;
  return { id: 'latest', ...data } as CmsLinkCheckReport;
}
