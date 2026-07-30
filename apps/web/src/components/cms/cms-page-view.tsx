'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CmsBlock, CmsLink, CmsPage, CmsSiteGlobals } from '@clcrm/types';
import { marketingIcon } from '@/lib/marketing-icons';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/lib/firebase-auth';
import { CmsMarketingChrome } from '@/components/cms/cms-marketing-chrome';
import { TRPCProvider, trpc } from '@/lib/trpc';
import { hexToHslComponents } from '@/lib/hex-to-hsl';

function resolveHref(href: string, loggedIn: boolean) {
  if (href === '/sign-up' && loggedIn) return '/app';
  return href;
}

function CtaLink({
  link,
  loggedIn,
  className,
}: {
  link: CmsLink;
  loggedIn: boolean;
  className?: string;
}) {
  const href = resolveHref(link.href, loggedIn);
  const style =
    link.style === 'secondary'
      ? 'btn-secondary'
      : link.style === 'ghost'
        ? 'btn-ghost'
        : link.style === 'link'
          ? 'text-primary underline-offset-4 hover:underline'
          : 'btn-primary';
  return (
    <Link
      href={href}
      target={link.openInNewTab ? '_blank' : undefined}
      rel={link.openInNewTab ? 'noreferrer' : undefined}
      className={`${style} ${className ?? ''}`.trim()}
    >
      {link.label}
      {link.style !== 'ghost' && link.style !== 'link' ? <ArrowRight className="h-4 w-4" /> : null}
    </Link>
  );
}

function blockVisibilityClass(block: CmsBlock) {
  const v = block.style?.visibility;
  if (!v) return '';
  const parts: string[] = [];
  if (!v.mobile) parts.push('hidden');
  if (v.mobile && !v.tablet) parts.push('md:hidden');
  if (v.tablet && !v.desktop) parts.push('lg:hidden');
  if (!v.mobile && v.tablet) parts.push('md:block');
  if (!v.mobile && !v.tablet && v.desktop) parts.push('lg:block');
  return parts.join(' ');
}

function HeroBlockView({ block }: { block: Extract<CmsBlock, { type: 'hero' }> }) {
  const { user } = useAuth();
  return (
    <section className={`mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pt-24 ${blockVisibilityClass(block)}`}>
      <div className="mx-auto max-w-3xl text-center">
        {block.eyebrow ? (
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {block.eyebrow}
          </p>
        ) : null}
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl sm:leading-[1.1]">
          {block.headline}{' '}
          {block.headlineAccent ? (
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              {block.headlineAccent}
            </span>
          ) : null}
        </h1>
        {block.subheadline ? (
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {block.subheadline}
          </p>
        ) : null}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {block.primaryCta ? (
            <CtaLink link={block.primaryCta} loggedIn={!!user} className="px-8 py-3 text-base" />
          ) : null}
          {block.secondaryCta ? (
            <CtaLink link={block.secondaryCta} loggedIn={!!user} className="px-8 py-3 text-base" />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function PreviewDashboardView({ block }: { block: Extract<CmsBlock, { type: 'preview_dashboard' }> }) {
  return (
    <section className={`mx-auto max-w-6xl px-6 pb-16 ${blockVisibilityClass(block)}`}>
      <div className="relative mx-auto max-w-5xl">
        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/10 to-emerald-500/10 blur-2xl" />
        <div className="card relative overflow-hidden shadow-soft">
          <div className="border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
            </div>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-3">
            {block.stats.map((stat) => (
              <div key={stat.id} className="rounded-xl bg-muted/50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                {stat.change ? (
                  <p className="mt-1 text-xs font-medium text-emerald-600">{stat.change}</p>
                ) : null}
              </div>
            ))}
          </div>
          {block.routeText ? (
            <div className="border-t border-border bg-muted/20 px-6 py-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {(() => {
                  const RouteIcon = marketingIcon('route');
                  return <RouteIcon className="h-4 w-4 text-primary" />;
                })()}
                {block.routeText}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function FeatureGridView({ block }: { block: Extract<CmsBlock, { type: 'feature_grid' }> }) {
  return (
    <section
      className={`border-t border-border/60 bg-surface/60 py-20 ${blockVisibilityClass(block)}`}
    >
      <div className="mx-auto max-w-6xl px-6">
        {(block.title || block.subtitle) && (
          <div className="mb-12 max-w-2xl">
            {block.title ? (
              <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
            ) : null}
            {block.subtitle ? (
              <p className="mt-3 text-muted-foreground">{block.subtitle}</p>
            ) : null}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {block.features.map((feature) => {
            const Icon = marketingIcon(feature.icon);
            return (
              <div
                key={feature.id}
                className={`card-hover p-6 ${feature.wide ? 'lg:col-span-2' : ''}`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CtaView({ block }: { block: Extract<CmsBlock, { type: 'cta' }> }) {
  const { user } = useAuth();
  return (
    <section className={`py-20 ${blockVisibilityClass(block)}`}>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight">{block.title}</h2>
        {block.body ? <p className="mt-3 text-muted-foreground">{block.body}</p> : null}
        {block.button ? (
          <div className="mt-8 flex justify-center">
            <CtaLink link={block.button} loggedIn={!!user} className="px-8 py-3 text-base" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PricingTableView({ block }: { block: Extract<CmsBlock, { type: 'pricing_table' }> }) {
  const { user } = useAuth();
  return (
    <section className={`mx-auto max-w-6xl px-6 py-16 sm:py-24 ${blockVisibilityClass(block)}`}>
      <div className="mx-auto max-w-2xl text-center">
        {block.title ? <h1 className="text-4xl font-bold tracking-tight">{block.title}</h1> : null}
        {block.subtitle ? (
          <p className="mt-4 text-lg text-muted-foreground">{block.subtitle}</p>
        ) : null}
      </div>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {block.plans.map((plan) => (
          <div
            key={plan.id}
            className={`card relative p-8 ${plan.highlight ? 'ring-2 ring-primary shadow-soft' : ''}`}
          >
            {plan.badge ? (
              <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {plan.badge}
              </span>
            ) : null}
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </p>
            <ul className="mt-6 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            {plan.cta ? (
              <div className="mt-8">
                <CtaLink
                  link={plan.cta}
                  loggedIn={!!user}
                  className="w-full justify-center px-6 py-3"
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function FaqView({ block }: { block: Extract<CmsBlock, { type: 'faq' }> }) {
  return (
    <section className={`mx-auto max-w-3xl px-6 py-16 ${blockVisibilityClass(block)}`}>
      {block.title ? <h2 className="mb-8 text-3xl font-bold">{block.title}</h2> : null}
      <div className="space-y-4">
        {block.items.map((item) => (
          <details key={item.id} className="rounded-xl border border-border bg-surface p-4">
            <summary className="cursor-pointer font-medium">{item.question}</summary>
            <p className="mt-3 text-sm text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function RichTextView({ block }: { block: Extract<CmsBlock, { type: 'rich_text' }> }) {
  return (
    <section className={`mx-auto max-w-3xl px-6 py-12 prose prose-slate ${blockVisibilityClass(block)}`}>
      <div dangerouslySetInnerHTML={{ __html: block.html }} />
    </section>
  );
}

function SpacerView({ block }: { block: Extract<CmsBlock, { type: 'spacer' }> }) {
  return <div style={{ height: block.height }} className={blockVisibilityClass(block)} aria-hidden />;
}

function DividerView({ block }: { block: Extract<CmsBlock, { type: 'divider' }> }) {
  return (
    <div className={`mx-auto max-w-6xl px-6 ${blockVisibilityClass(block)}`}>
      <hr className="border-border" />
    </div>
  );
}

function CustomHtmlView({ block }: { block: Extract<CmsBlock, { type: 'custom_html' }> }) {
  return (
    <div
      className={blockVisibilityClass(block)}
      dangerouslySetInnerHTML={{ __html: block.html }}
    />
  );
}

function ImageView({ block }: { block: Extract<CmsBlock, { type: 'image' }> }) {
  return (
    <figure className={`mx-auto max-w-5xl px-6 py-8 ${blockVisibilityClass(block)}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.src} alt={block.alt} className="w-full rounded-2xl" />
      {block.caption ? (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          {block.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function TestimonialsView({ block }: { block: Extract<CmsBlock, { type: 'testimonials' }> }) {
  return (
    <section className={`mx-auto max-w-6xl px-6 py-16 ${blockVisibilityClass(block)}`}>
      {block.title ? <h2 className="mb-10 text-center text-3xl font-bold">{block.title}</h2> : null}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {block.items.map((item) => (
          <blockquote key={item.id} className="card p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{item.quote}&rdquo;</p>
            <footer className="mt-4 text-sm font-medium">
              {item.author}
              {item.role ? <span className="text-muted-foreground"> — {item.role}</span> : null}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

function ButtonsView({ block }: { block: Extract<CmsBlock, { type: 'buttons' }> }) {
  const { user } = useAuth();
  return (
    <div className={`flex flex-wrap justify-center gap-3 px-6 py-8 ${blockVisibilityClass(block)}`}>
      {block.buttons.map((btn, i) => (
        <CtaLink key={`${btn.href}-${i}`} link={btn} loggedIn={!!user} />
      ))}
    </div>
  );
}

function ContactFormView({ block }: { block: Extract<CmsBlock, { type: 'contact_form' }> }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [honeypot, setHoneypot] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: form } = trpc.siteCms.forms.publicGet.useQuery(
    { id: block.formId! },
    { enabled: !!block.formId },
  );
  const submit = trpc.siteCms.forms.publicSubmit.useMutation({
    onSuccess: (res) => {
      setDone(res.successMessage);
      if (res.redirectUrl) window.location.href = res.redirectUrl;
    },
    onError: (e) => setError(e.message),
  });

  const fields = form?.fields;
  const submitLabel = block.submitLabel || form?.settings.submitLabel || 'Send';

  return (
    <section className={`mx-auto max-w-xl px-6 py-16 ${blockVisibilityClass(block)}`}>
      {block.title ? <h2 className="mb-6 text-2xl font-bold">{block.title}</h2> : null}
      {done ? (
        <div className="card p-6 text-sm text-emerald-700">{done}</div>
      ) : (
        <form
          className="card space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!block.formId) {
              setDone(block.successMessage || 'Thanks — we will be in touch.');
              return;
            }
            submit.mutate({ formId: block.formId, data: values, honeypot });
          }}
        >
          <input
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            aria-hidden
          />
          {(fields ?? [
            { id: 'n', type: 'text' as const, label: 'Name', name: 'name', required: true },
            { id: 'e', type: 'email' as const, label: 'Email', name: 'email', required: true },
            { id: 'm', type: 'textarea' as const, label: 'Message', name: 'message', required: true },
          ]).map((field) => {
            if (field.type === 'consent' || field.type === 'checkbox') {
              return (
                <label key={field.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    required={field.required}
                    checked={Boolean(values[field.name])}
                    onChange={(e) => setValues({ ...values, [field.name]: e.target.checked })}
                  />
                  <span>{field.label}</span>
                </label>
              );
            }
            if (field.type === 'textarea') {
              return (
                <textarea
                  key={field.id}
                  className="w-full rounded-lg border border-border px-3 py-2"
                  rows={4}
                  placeholder={field.label}
                  required={field.required}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                />
              );
            }
            if (field.type === 'select') {
              return (
                <select
                  key={field.id}
                  className="w-full rounded-lg border border-border px-3 py-2"
                  required={field.required}
                  value={String(values[field.name] ?? '')}
                  onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                >
                  <option value="">Select {field.label}</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              );
            }
            return (
              <input
                key={field.id}
                className="w-full rounded-lg border border-border px-3 py-2"
                type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                placeholder={field.label}
                required={field.required}
                value={String(values[field.name] ?? '')}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
              />
            );
          })}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="btn-primary w-full justify-center" disabled={submit.isPending}>
            {submitLabel}
          </button>
        </form>
      )}
    </section>
  );
}

function CollectionListView({ block }: { block: Extract<CmsBlock, { type: 'collection_list' }> }) {
  const { data: entries } = trpc.siteCms.collections.publicEntries.useQuery(
    {
      collectionId: block.collectionId,
      featuredOnly: block.featuredOnly,
      limit: block.limit ?? 6,
    },
    { enabled: !!block.collectionId },
  );

  return (
    <section className={`mx-auto max-w-6xl px-6 py-16 ${blockVisibilityClass(block)}`}>
      {block.title ? <h2 className="mb-8 text-3xl font-bold">{block.title}</h2> : null}
      {!block.collectionId ? (
        <p className="text-sm text-muted-foreground">Select a collection ID in the page builder.</p>
      ) : (
        <div className={block.layout === 'list' ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
          {entries?.map((entry) => (
            <article key={entry.id} className="card p-5">
              <h3 className="font-semibold">{entry.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {String(entry.data.body ?? entry.data.description ?? '')}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function renderBlock(block: CmsBlock) {
  if (!block.enabled) return null;
  switch (block.type) {
    case 'hero':
      return <HeroBlockView key={block.id} block={block} />;
    case 'preview_dashboard':
      return <PreviewDashboardView key={block.id} block={block} />;
    case 'feature_grid':
      return <FeatureGridView key={block.id} block={block} />;
    case 'cta':
      return <CtaView key={block.id} block={block} />;
    case 'pricing_table':
      return <PricingTableView key={block.id} block={block} />;
    case 'faq':
      return <FaqView key={block.id} block={block} />;
    case 'rich_text':
      return <RichTextView key={block.id} block={block} />;
    case 'spacer':
      return <SpacerView key={block.id} block={block} />;
    case 'divider':
      return <DividerView key={block.id} block={block} />;
    case 'custom_html':
      return <CustomHtmlView key={block.id} block={block} />;
    case 'image':
      return <ImageView key={block.id} block={block} />;
    case 'testimonials':
      return <TestimonialsView key={block.id} block={block} />;
    case 'buttons':
      return <ButtonsView key={block.id} block={block} />;
    case 'contact_form':
      return <ContactFormView key={block.id} block={block} />;
    case 'collection_list':
      return <CollectionListView key={block.id} block={block} />;
    case 'stats':
      return (
        <PreviewDashboardView
          key={block.id}
          block={{
            ...block,
            type: 'preview_dashboard',
            stats: block.items,
            routeText: block.footerText,
          }}
        />
      );
    case 'image_text':
    case 'video':
    case 'gallery':
      return (
        <section key={block.id} className="mx-auto max-w-3xl px-6 py-8 text-sm text-muted-foreground">
          [{block.type}] block — configure in Website CMS
        </section>
      );
    default:
      return null;
  }
}

function CmsNotices({ pageSlug }: { pageSlug: string }) {
  const [ready, setReady] = useState(false);
  const { data: notices } = trpc.siteCms.notices.active.useQuery(
    { pageSlug },
    { enabled: ready, staleTime: 60_000 },
  );
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('cms-notice-dismissed');
      if (raw) setDismissed(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  function dismiss(id: string, frequency: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      if (frequency === 'session') sessionStorage.setItem('cms-notice-dismissed', JSON.stringify(next));
      if (frequency === 'once') localStorage.setItem(`cms-notice-${id}`, '1');
    } catch {
      /* ignore */
    }
  }

  const visible = (notices ?? []).filter((n) => {
    if (dismissed.includes(n.id)) return false;
    try {
      if (n.displayFrequency === 'once' && localStorage.getItem(`cms-notice-${n.id}`)) return false;
    } catch {
      /* ignore */
    }
    return n.type === 'announcement_bar' || n.type === 'emergency' || n.type === 'promo_banner';
  });

  const modal = (notices ?? []).find(
    (n) =>
      (n.type === 'modal' || n.type === 'cookie') &&
      !dismissed.includes(n.id) &&
      !(typeof window !== 'undefined' && n.displayFrequency === 'once' && localStorage.getItem(`cms-notice-${n.id}`)),
  );

  return (
    <>
      {visible.map((n) => (
        <div
          key={n.id}
          className="relative px-4 py-2 text-center text-sm font-medium"
          style={{
            background: n.backgroundColor ?? (n.type === 'emergency' ? '#991b1b' : 'var(--primary)'),
            color: n.textColor ?? '#fff',
          }}
        >
          <strong>{n.title}</strong>
          {n.body ? <span className="ml-2 opacity-90">{n.body}</span> : null}
          {n.buttonHref && n.buttonLabel ? (
            <Link href={n.buttonHref} className="ml-3 underline">
              {n.buttonLabel}
            </Link>
          ) : null}
          {n.dismissible ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Dismiss"
              onClick={() => dismiss(n.id, n.displayFrequency)}
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ))}
      {modal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="card max-w-md p-6 shadow-soft">
            <h2 className="text-lg font-semibold">{modal.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{modal.body}</p>
            <div className="mt-4 flex justify-end gap-2">
              {modal.buttonHref && modal.buttonLabel ? (
                <Link href={modal.buttonHref} className="btn-primary">
                  {modal.buttonLabel}
                </Link>
              ) : null}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => dismiss(modal.id, modal.displayFrequency)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CmsPageViewInner({
  page,
  globals,
}: {
  page: CmsPage;
  globals: CmsSiteGlobals;
}) {
  const branding = globals.branding;
  const primaryHsl = hexToHslComponents(branding.primaryColor);
  const accentHsl = hexToHslComponents(branding.accentColor);
  return (
    <div
      className="mesh-bg min-h-screen"
      style={
        {
          ...(primaryHsl ? { ['--primary' as string]: primaryHsl } : null),
          ...(accentHsl ? { ['--accent' as string]: accentHsl } : null),
        } as React.CSSProperties
      }
    >
      <CmsNotices pageSlug={page.slug} />
      <CmsMarketingChrome globals={globals} />
      <main>{page.blocks.map((block) => renderBlock(block))}</main>
      <footer
        className="border-t border-border/60 py-10"
        style={
          globals.footer.background
            ? { background: globals.footer.background, color: globals.footer.textColor ?? undefined }
            : undefined
        }
      >
        <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {globals.footer.columns.map((col) => (
            <div key={col.id}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              {col.text ? <p className="mt-2 text-sm text-muted-foreground">{col.text}</p> : null}
              {col.links?.length ? (
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={`${col.id}-${link.href}`}>
                      <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">{globals.footer.copyrightText}</p>
      </footer>
    </div>
  );
}

export function CmsPageView({
  page,
  globals,
}: {
  page: CmsPage;
  globals: CmsSiteGlobals;
}) {
  return (
    <TRPCProvider>
      <CmsPageViewInner page={page} globals={globals} />
    </TRPCProvider>
  );
}
