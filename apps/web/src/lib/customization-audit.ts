/**
 * Website & CRM customization audit — living checklist against the full CMS requirement.
 * Status: done | partial | missing
 */
export const CUSTOMIZATION_AUDIT = [
  { area: 'Visual page builder — create/duplicate/rename/delete pages', status: 'done', where: 'Creator → Website → Pages' },
  { area: 'Draft / publish / unpublish / schedule', status: 'partial', where: 'Page status + scheduledPublishAt field; schedule automation incomplete' },
  { area: 'Reorder / hide / duplicate / delete sections', status: 'done', where: 'Page block controls' },
  { area: 'Reusable saved sections library', status: 'missing', where: '—' },
  { area: 'Device preview desktop/tablet/mobile', status: 'partial', where: 'Page editor width modes (not live WYSIWYG canvas)' },
  { area: 'Inline edit from preview', status: 'missing', where: '—' },
  { area: 'Undo / redo', status: 'done', where: 'Page editor' },
  { area: 'Version history restore', status: 'partial', where: 'API + versions stored; UI restore list not yet in console' },
  { area: 'Block library (hero, pricing, FAQ, forms, HTML, collections…)', status: 'partial', where: 'Most core blocks; slideshow/maps/calendars still stubs' },
  { area: 'Per-block style (padding, visibility, CSS class…)', status: 'partial', where: 'Schema + visibility classes; full style UI incomplete' },
  { area: 'Content in DB not React', status: 'done', where: 'Firestore platform/website/*' },
  { area: 'Rich text editor', status: 'partial', where: 'HTML textarea; no TipTap/ProseMirror yet' },
  { area: 'Global branding', status: 'done', where: 'Chrome & SEO tab + CRM branding settings' },
  { area: 'Header / nav builder', status: 'done', where: 'Chrome & SEO tab' },
  { area: 'Footer builder', status: 'partial', where: 'Columns + copyright; multi-footer assignment missing' },
  { area: 'Media library', status: 'done', where: 'Website → Media (upload, alt, caption, delete guard)' },
  { area: 'Image crop / focal / responsive variants', status: 'partial', where: 'Focal point field only' },
  { area: 'Forms builder + submissions', status: 'done', where: 'Website → Forms' },
  { area: 'Multi-step / conditional / CAPTCHA / signatures', status: 'partial', where: 'Honeypot spam only' },
  { area: 'SEO per page + robots + sitemap + redirects', status: 'done', where: 'Page SEO fields, SEO tab, /robots.txt, /sitemap.xml, redirects list' },
  { area: 'Broken link monitoring', status: 'missing', where: '—' },
  { area: 'Responsive independent section order', status: 'partial', where: 'Visibility only' },
  { area: 'Themes / dark mode / layout templates', status: 'partial', where: 'Brand colors; no multi-theme switcher' },
  { area: 'Collections', status: 'done', where: 'Website → Collections + collection_list block' },
  { area: 'CMS RBAC roles', status: 'partial', where: 'Creator-only today' },
  { area: 'CRM nav / labels / modules / custom fields', status: 'done', where: 'Settings → Navigation & UI' },
  { area: 'Email template visual editor', status: 'partial', where: 'Existing message templates (plain text)' },
  { area: 'Popups / banners / announcements', status: 'done', where: 'Chrome & SEO → Notices' },
  { area: 'Integrations admin layer', status: 'partial', where: 'CRM integrations settings; marketing integrations incomplete' },
  { area: 'Custom CSS/JS injection', status: 'partial', where: 'custom_html blocks; no global script settings UI' },
  { area: 'Search system', status: 'missing', where: '—' },
  { area: 'Localization architecture', status: 'partial', where: 'Schema-ready content docs; no locale UI' },
  { area: 'Accessibility warnings in editor', status: 'missing', where: '—' },
  { area: 'Performance (lazy images, CDN paths)', status: 'partial', where: 'Storage proxy; lazy loading incomplete' },
] as const;

export type AuditStatus = (typeof CUSTOMIZATION_AUDIT)[number]['status'];
