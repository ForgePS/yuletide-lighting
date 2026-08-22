/**
 * Website & CRM customization audit — living checklist against the full CMS requirement.
 * Status: done | partial | missing
 * YL-S27–S30 (CMS Phases 1–4) updates applied.
 */
export const CUSTOMIZATION_AUDIT = [
  { area: 'Visual page builder — create/duplicate/rename/delete pages', status: 'done', where: 'Creator → Website → Pages' },
  { area: 'Draft / publish / unpublish / schedule', status: 'done', where: 'Status + datetime UI; Inngest cms-scheduled-publish cron' },
  { area: 'Reorder / hide / duplicate / delete sections', status: 'done', where: 'Page block controls' },
  { area: 'Reusable saved sections library', status: 'done', where: 'Pages → Section library (save/insert)' },
  { area: 'Device preview desktop/tablet/mobile', status: 'done', where: 'Width modes + Live preview iframe' },
  { area: 'Inline edit from preview', status: 'done', where: 'Draft preview shell + postMessage click-to-select' },
  { area: 'Undo / redo', status: 'done', where: 'Page editor' },
  { area: 'Version history restore', status: 'done', where: 'Pages editor → Version history panel' },
  { area: 'Block library (hero, pricing, FAQ, forms, HTML, collections…)', status: 'done', where: 'Includes slideshow, map, calendar, gallery, video, image_text, site_search' },
  { area: 'Per-block style (padding, visibility, CSS class…)', status: 'done', where: 'Block style editor + cms-page-view BlockShell' },
  { area: 'Content in DB not React', status: 'done', where: 'Firestore platform/website/*' },
  { area: 'Rich text editor', status: 'done', where: 'TipTap visual editor + HTML source toggle' },
  { area: 'Global branding', status: 'done', where: 'Chrome & SEO tab + CRM branding settings' },
  { area: 'Header / nav builder', status: 'done', where: 'Chrome & SEO tab' },
  { area: 'Footer builder', status: 'done', where: 'Default footer + named footers + per-page footerId' },
  { area: 'Media library', status: 'done', where: 'Website → Media (upload, alt, caption, delete guard)' },
  { area: 'Image crop / focal / responsive variants', status: 'done', where: 'Focal + crop % + variants/srcset on image blocks & media' },
  { area: 'Forms builder + submissions', status: 'done', where: 'Website → Forms' },
  { area: 'Multi-step / conditional / CAPTCHA / signatures', status: 'done', where: 'Multi-step, visibleWhen, Turnstile, signature pad' },
  { area: 'SEO per page + robots + sitemap + redirects', status: 'done', where: 'Page SEO fields, SEO tab, /robots.txt, /sitemap.xml, redirects list' },
  { area: 'Broken link monitoring', status: 'done', where: 'Chrome & SEO → Broken link monitor + weekly Inngest cron' },
  { area: 'Responsive independent section order', status: 'done', where: 'blockOrderByBreakpoint capture + public renderer sort' },
  { area: 'Themes / dark mode / layout templates', status: 'done', where: 'themeMode / themePreset / layoutTemplate on globals' },
  { area: 'Collections', status: 'done', where: 'Website → Collections + collection_list block' },
  { area: 'CMS RBAC roles', status: 'partial', where: 'Platform Creator-only by design (org website CMS deferred)' },
  { area: 'CRM nav / labels / modules / custom fields', status: 'done', where: 'Settings → Navigation & UI' },
  { area: 'Email template visual editor', status: 'done', where: 'Messages → Templates TipTap for email channel' },
  { area: 'Popups / banners / announcements', status: 'done', where: 'Chrome & SEO → Notices' },
  { area: 'Integrations admin layer', status: 'done', where: 'GTM/Meta Pixel + Custom CSS/JS on Chrome tab' },
  { area: 'Custom CSS/JS injection', status: 'done', where: 'Chrome & SEO → Custom CSS / JS + marketing page inject' },
  { area: 'Search system', status: 'done', where: 'site_search block + websiteCms.public.search' },
  { area: 'Localization architecture', status: 'done', where: 'Page locale + translations overlays + ?lang= switcher' },
  { area: 'Accessibility warnings in editor', status: 'done', where: 'Pages → Accessibility checks panel' },
  { area: 'Performance (lazy images, CDN paths)', status: 'done', where: 'loading=lazy + srcset variants; Storage proxy paths' },
] as const;

export type AuditStatus = (typeof CUSTOMIZATION_AUDIT)[number]['status'];
