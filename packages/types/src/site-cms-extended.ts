/** Extended website CMS: media, forms, collections, notices, redirects. */

export type MediaFileKind = 'image' | 'video' | 'pdf' | 'document' | 'audio' | 'other';

export type CmsMediaAsset = {
  id: string;
  name: string;
  originalName: string;
  path: string;
  url: string;
  folder: string;
  kind: MediaFileKind;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  caption: string;
  width?: number | null;
  height?: number | null;
  focalPoint?: { x: number; y: number } | null;
  usedBy: Array<{ type: string; id: string; label?: string }>;
  createdAt: Date;
  updatedAt: Date;
  createdByEmail?: string;
};

export type CmsFormFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'number'
  | 'date'
  | 'file'
  | 'consent'
  | 'hidden';

export type CmsFormField = {
  id: string;
  type: CmsFormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  helpText?: string;
  width?: 'full' | 'half';
  validation?: { min?: number; max?: number; pattern?: string };
};

export type CmsFormSettings = {
  submitLabel: string;
  successMessage: string;
  redirectUrl?: string | null;
  notifyEmails: string[];
  confirmationEmailEnabled: boolean;
  confirmationSubject?: string;
  confirmationBody?: string;
  spamProtection: 'none' | 'honeypot';
  multiStep: boolean;
};

export type CmsForm = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  fields: CmsFormField[];
  settings: CmsFormSettings;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsFormSubmissionStatus = 'new' | 'read' | 'replied' | 'spam' | 'archived';

export type CmsFormSubmission = {
  id: string;
  formId: string;
  formName: string;
  data: Record<string, unknown>;
  status: CmsFormSubmissionStatus;
  notes: string;
  createdAt: Date;
  ipHash?: string | null;
};

export type CmsCollectionFieldType = 'text' | 'textarea' | 'rich_text' | 'number' | 'date' | 'image' | 'url' | 'boolean' | 'select';

export type CmsCollectionField = {
  id: string;
  key: string;
  label: string;
  type: CmsCollectionFieldType;
  required: boolean;
  options?: string[];
};

export type CmsCollection = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  fields: CmsCollectionField[];
  createdAt: Date;
  updatedAt: Date;
};

export type CmsCollectionEntryStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export type CmsCollectionEntry = {
  id: string;
  collectionId: string;
  title: string;
  slug: string;
  status: CmsCollectionEntryStatus;
  data: Record<string, unknown>;
  tags: string[];
  featured: boolean;
  sortOrder: number;
  publishedAt?: Date | null;
  scheduledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsNoticeType =
  | 'announcement_bar'
  | 'emergency'
  | 'promo_banner'
  | 'modal'
  | 'exit_intent'
  | 'cookie';

export type CmsNotice = {
  id: string;
  name: string;
  type: CmsNoticeType;
  enabled: boolean;
  title: string;
  body: string;
  buttonLabel?: string | null;
  buttonHref?: string | null;
  imageUrl?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  priority: number;
  startAt?: Date | null;
  endAt?: Date | null;
  targetPages: 'all' | string[];
  targetDevices: Array<'desktop' | 'tablet' | 'mobile'>;
  displayFrequency: 'always' | 'once' | 'session';
  dismissible: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsRedirect = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CmsSeoGlobals = {
  robotsTxt: string;
  defaultTitleTemplate: string;
  defaultDescription: string;
  twitterHandle?: string | null;
  organizationSchemaJson?: string | null;
  updatedAt: Date;
};

export const DEFAULT_FORM_SETTINGS: CmsFormSettings = {
  submitLabel: 'Send message',
  successMessage: 'Thanks — we will be in touch shortly.',
  redirectUrl: null,
  notifyEmails: [],
  confirmationEmailEnabled: false,
  confirmationSubject: 'We received your message',
  confirmationBody: 'Thanks for contacting us. We will reply soon.',
  spamProtection: 'honeypot',
  multiStep: false,
};

export const DEFAULT_SEO_GLOBALS: CmsSeoGlobals = {
  robotsTxt: 'User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n',
  defaultTitleTemplate: '%s | Yuletide Lighting',
  defaultDescription:
    'CRM built for Christmas light installers — proposals, inventory, scheduling, and messaging.',
  twitterHandle: null,
  organizationSchemaJson: null,
  updatedAt: new Date(0),
};

export function inferMediaKind(mimeType: string): MediaFileKind {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (
    mimeType.includes('document') ||
    mimeType.includes('sheet') ||
    mimeType.includes('msword') ||
    mimeType.includes('officedocument')
  ) {
    return 'document';
  }
  return 'other';
}

export function createCmsId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
