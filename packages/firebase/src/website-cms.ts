import type { DocumentData } from 'firebase-admin/firestore';
import type {
  CmsPage,
  CmsPageSummary,
  CmsPageVersion,
  CmsSiteGlobals,
} from '@clcrm/types';
import {
  buildDefaultHomePage,
  buildDefaultPricingPage,
  buildDefaultSiteGlobals,
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
const PUBLIC_BUNDLE_TTL_MS = 5 * 60_000;
const PUBLIC_CMS_DENY_TTL_MS = 60_000;
const PUBLIC_CMS_READ_TIMEOUT_MS = 1500;

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
    publicBundleCache.set(slug, { page, globals, expiresAt: Date.now() + PUBLIC_BUNDLE_TTL_MS });
    return { page, globals };
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
