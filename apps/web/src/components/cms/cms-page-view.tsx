'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { CmsBlock, CmsFormField, CmsLink, CmsPage, CmsSiteGlobals } from '@clcrm/types';
import { marketingIcon } from '@/lib/marketing-icons';
import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/lib/firebase-auth';
import { CmsMarketingChrome } from '@/components/cms/cms-marketing-chrome';
import { CmsMapEmbed } from '@/components/cms/cms-map-embed';
import { TRPCProvider, trpc } from '@/lib/trpc';
import { hexToHslComponents } from '@/lib/hex-to-hsl';
import {
  applyCmsLocale,
  detectBreakpointWidth,
  orderBlocksForBreakpoint,
} from '@/lib/cms-runtime';

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

function blockShellClass(block: CmsBlock) {
  const s = block.style;
  const parts = [blockVisibilityClass(block)];
  if (s?.customClass) parts.push(s.customClass);
  if (s?.width === 'narrow') parts.push('mx-auto max-w-2xl');
  else if (s?.width === 'contained') parts.push('mx-auto max-w-4xl');
  else if (s?.width === 'wide') parts.push('mx-auto max-w-6xl');
  else if (s?.width === 'full') parts.push('w-full');
  if (s?.alignment === 'center') parts.push('text-center');
  else if (s?.alignment === 'right') parts.push('text-right');
  if (s?.shadow === 'sm') parts.push('shadow-sm');
  else if (s?.shadow === 'md') parts.push('shadow-md');
  else if (s?.shadow === 'lg') parts.push('shadow-lg');
  return parts.filter(Boolean).join(' ');
}

function blockShellStyle(block: CmsBlock): CSSProperties | undefined {
  const s = block.style;
  if (!s) return undefined;
  const style: CSSProperties = {};
  if (s.padding?.top != null) style.paddingTop = s.padding.top;
  if (s.padding?.right != null) style.paddingRight = s.padding.right;
  if (s.padding?.bottom != null) style.paddingBottom = s.padding.bottom;
  if (s.padding?.left != null) style.paddingLeft = s.padding.left;
  if (s.margin?.top != null) style.marginTop = s.margin.top;
  if (s.margin?.bottom != null) style.marginBottom = s.margin.bottom;
  if (s.background) style.background = s.background;
  if (s.borderRadius != null) style.borderRadius = s.borderRadius;
  if (s.borderColor) {
    style.borderColor = s.borderColor;
    style.borderStyle = 'solid';
    style.borderWidth = s.borderWidth ?? 1;
  } else if (s.borderWidth != null) {
    style.borderWidth = s.borderWidth;
    style.borderStyle = 'solid';
  }
  return Object.keys(style).length ? style : undefined;
}

function BlockShell({
  block,
  children,
  editMode,
}: {
  block: CmsBlock;
  children: ReactNode;
  editMode?: boolean;
}) {
  return (
    <div
      id={block.style?.customId || undefined}
      data-cms-block-id={block.id}
      className={`${blockShellClass(block)} ${editMode ? 'outline outline-1 outline-transparent hover:outline-primary/40 cursor-pointer' : ''}`}
      style={blockShellStyle(block)}
      onClick={
        editMode
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              window.parent?.postMessage(
                { type: 'yl-cms-select-block', blockId: block.id },
                '*',
              );
            }
          : undefined
      }
      role={editMode ? 'button' : undefined}
    >
      {children}
    </div>
  );
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
  const focal = block.focalPoint;
  const objectPosition =
    focal && typeof focal.x === 'number' && typeof focal.y === 'number'
      ? `${focal.x}% ${focal.y}%`
      : undefined;
  const srcSet = block.variants?.length
    ? block.variants.map((v) => `${v.url} ${v.width}w`).join(', ')
    : undefined;
  const crop = block.crop;
  return (
    <figure className={`mx-auto max-w-5xl px-6 py-8 ${blockVisibilityClass(block)}`}>
      <div
        className="overflow-hidden rounded-2xl"
        style={
          crop
            ? {
                clipPath: `inset(${crop.y}% ${Math.max(0, 100 - crop.x - crop.width)}% ${Math.max(0, 100 - crop.y - crop.height)}% ${crop.x}%)`,
              }
            : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={block.src}
          srcSet={srcSet}
          sizes={srcSet ? '(max-width: 768px) 100vw, 1152px' : undefined}
          alt={block.alt}
          loading="lazy"
          decoding="async"
          className="w-full rounded-2xl object-cover"
          style={objectPosition ? { objectPosition } : undefined}
        />
      </div>
      {block.caption ? (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          {block.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ImageTextView({ block }: { block: Extract<CmsBlock, { type: 'image_text' }> }) {
  const { user } = useAuth();
  const imageFirst = block.imagePosition !== 'right';
  return (
    <section className={`mx-auto grid max-w-6xl items-center gap-8 px-6 py-16 md:grid-cols-2 ${blockVisibilityClass(block)}`}>
      <div className={imageFirst ? 'order-1' : 'order-2'}>
        {block.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.imageUrl}
            alt={block.imageAlt}
            loading="lazy"
            className="w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
            Add an image URL
          </div>
        )}
      </div>
      <div className={imageFirst ? 'order-2' : 'order-1'}>
        {block.title ? <h2 className="text-3xl font-bold">{block.title}</h2> : null}
        {block.body ? <p className="mt-4 text-muted-foreground">{block.body}</p> : null}
        {block.cta ? (
          <div className="mt-6">
            <CtaLink link={block.cta} loggedIn={!!user} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function VideoView({ block }: { block: Extract<CmsBlock, { type: 'video' }> }) {
  const embed = toEmbedUrl(block.embedUrl);
  return (
    <section className={`mx-auto max-w-4xl px-6 py-12 ${blockVisibilityClass(block)}`}>
      {block.title ? <h2 className="mb-6 text-center text-2xl font-bold">{block.title}</h2> : null}
      {embed ? (
        <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-black">
          <iframe
            src={embed}
            title={block.title || 'Video'}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">Add a YouTube or Vimeo embed URL.</p>
      )}
    </section>
  );
}

function toEmbedUrl(url: string) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
    }
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith('/embed/')) return url;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return url;
  }
  return url;
}

function GalleryView({ block }: { block: Extract<CmsBlock, { type: 'gallery' }> }) {
  return (
    <section className={`mx-auto max-w-6xl px-6 py-12 ${blockVisibilityClass(block)}`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {block.images.map((img) => (
          <figure key={img.id} className="overflow-hidden rounded-2xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            {img.caption ? (
              <figcaption className="px-3 py-2 text-xs text-muted-foreground">{img.caption}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

function SlideshowView({ block }: { block: Extract<CmsBlock, { type: 'slideshow' }> }) {
  const [index, setIndex] = useState(0);
  const slides = block.slides;
  useEffect(() => {
    if (!block.autoplay || slides.length < 2) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, block.intervalMs ?? 5000);
    return () => window.clearInterval(t);
  }, [block.autoplay, block.intervalMs, slides.length]);

  if (!slides.length) {
    return (
      <section className={`mx-auto max-w-5xl px-6 py-12 text-sm text-muted-foreground ${blockVisibilityClass(block)}`}>
        Add slides in the Website CMS.
      </section>
    );
  }
  const slide = slides[index]!;
  const inner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.src}
      alt={slide.alt}
      className="aspect-[16/9] w-full object-cover"
      loading={index === 0 ? 'eager' : 'lazy'}
    />
  );
  return (
    <section className={`mx-auto max-w-5xl px-6 py-12 ${blockVisibilityClass(block)}`}>
      <div className="overflow-hidden rounded-2xl border border-border bg-muted">
        {slide.href ? (
          <a href={slide.href} target="_blank" rel="noreferrer">
            {inner}
          </a>
        ) : (
          inner
        )}
        {slide.caption ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">{slide.caption}</p>
        ) : null}
      </div>
      {block.showDots !== false && slides.length > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full ${i === index ? 'bg-primary' : 'bg-border'}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function MapBlockView({ block }: { block: Extract<CmsBlock, { type: 'map' }> }) {
  return (
    <section className={`mx-auto max-w-5xl px-6 py-12 ${blockVisibilityClass(block)}`}>
      <CmsMapEmbed
        lat={block.lat}
        lng={block.lng}
        zoom={block.zoom}
        markerLabel={block.markerLabel}
        height={block.height}
      />
    </section>
  );
}

function CalendarView({ block }: { block: Extract<CmsBlock, { type: 'calendar' }> }) {
  return (
    <section className={`mx-auto max-w-3xl px-6 py-12 ${blockVisibilityClass(block)}`}>
      {block.title ? <h2 className="mb-6 text-2xl font-bold">{block.title}</h2> : null}
      {block.mode === 'embed_url' && block.embedUrl ? (
        <iframe
          src={block.embedUrl}
          title={block.title || 'Calendar'}
          className="h-[520px] w-full rounded-2xl border border-border"
        />
      ) : (
        <ul className="space-y-3">
          {(block.events ?? []).map((ev) => (
            <li key={ev.id} className="card p-4">
              <p className="font-semibold">{ev.title}</p>
              <p className="text-sm text-muted-foreground">
                {ev.start}
                {ev.end ? ` – ${ev.end}` : ''}
                {ev.location ? ` · ${ev.location}` : ''}
              </p>
            </li>
          ))}
          {!block.events?.length ? (
            <li className="text-sm text-muted-foreground">No events yet.</li>
          ) : null}
        </ul>
      )}
    </section>
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
  const [captchaToken, setCaptchaToken] = useState('');
  const [step, setStep] = useState(1);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const turnstileHost = useRef<HTMLDivElement>(null);

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

  const allFields: Array<Partial<CmsFormField> & { id: string; type: string; label: string; name: string; required: boolean }> =
    form?.fields ??
    ([
      { id: 'n', type: 'text', label: 'Name', name: 'name', required: true, step: 1 },
      { id: 'e', type: 'email', label: 'Email', name: 'email', required: true, step: 1 },
      { id: 'm', type: 'textarea', label: 'Message', name: 'message', required: true, step: 1 },
    ] as const);

  const multiStep = Boolean(form?.settings.multiStep);
  const maxStep = multiStep
    ? Math.max(1, ...allFields.map((f) => f.step ?? 1))
    : 1;
  const visibleFields = allFields.filter((field) => {
    if (multiStep && (field.step ?? 1) !== step) return false;
    return isClientFieldVisible(field, values);
  });
  const submitLabel = block.submitLabel || form?.settings.submitLabel || 'Send';
  const turnstileSiteKey =
    form?.settings.spamProtection === 'turnstile'
      ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      : undefined;

  useEffect(() => {
    if (!turnstileSiteKey || typeof window === 'undefined' || done) return;
    let cancelled = false;
    const w = window as unknown as {
      turnstile?: {
        render: (el: HTMLElement, opts: Record<string, unknown>) => string;
        ready?: (cb: () => void) => void;
      };
    };

    function renderWidget() {
      if (cancelled || !turnstileHost.current || !w.turnstile) return;
      turnstileHost.current.innerHTML = '';
      w.turnstile.render(turnstileHost.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => setCaptchaToken(token),
      });
    }

    const existing = document.querySelector('script[data-cms-turnstile]');
    if (existing) {
      renderWidget();
      return () => {
        cancelled = true;
      };
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.dataset.cmsTurnstile = '1';
    script.onload = () => renderWidget();
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [turnstileSiteKey, done, step, maxStep]);

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
            if (multiStep && step < maxStep) {
              setStep((s) => s + 1);
              return;
            }
            if (!block.formId) {
              setDone(block.successMessage || 'Thanks — we will be in touch.');
              return;
            }
            submit.mutate({
              formId: block.formId,
              data: values,
              honeypot,
              captchaToken: captchaToken || undefined,
            });
          }}
        >
          {multiStep ? (
            <p className="text-xs font-medium text-muted-foreground">
              Step {step} of {maxStep}
            </p>
          ) : null}
          <input
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            aria-hidden
          />
          {visibleFields.map((field) => renderFormField(field, values, setValues))}
          {turnstileSiteKey && step === maxStep ? <div ref={turnstileHost} /> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            {multiStep && step > 1 ? (
              <button
                type="button"
                className="btn-secondary flex-1 justify-center"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
              >
                Back
              </button>
            ) : null}
            <button
              type="submit"
              className="btn-primary flex-1 justify-center"
              disabled={submit.isPending}
            >
              {multiStep && step < maxStep ? 'Continue' : submitLabel}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function isClientFieldVisible(
  field: { visibleWhen?: CmsFormField['visibleWhen'] },
  values: Record<string, string | boolean>,
) {
  const rule = field.visibleWhen;
  if (!rule?.field) return true;
  const raw = values[rule.field];
  if (rule.op === 'truthy') return Boolean(raw);
  if (rule.op === 'falsy') return !raw;
  const str = String(raw ?? '');
  if (rule.op === 'eq') return str === (rule.value ?? '');
  if (rule.op === 'neq') return str !== (rule.value ?? '');
  return true;
}

function SignaturePad({
  value,
  onChange,
  label,
  required,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
  label: string;
  required?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">
        {label}
        {required ? ' *' : ''}
      </p>
      <canvas
        ref={canvasRef}
        width={400}
        height={140}
        className="w-full rounded-lg border border-border bg-white touch-none"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
          const canvas = canvasRef.current;
          if (canvas) onChange(canvas.toDataURL('image/png'));
        }}
      />
      <button
        type="button"
        className="text-xs text-muted-foreground underline"
        onClick={() => {
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            onChange('');
          }
        }}
      >
        Clear signature {value ? '' : '(empty)'}
      </button>
    </div>
  );
}

function renderFormField(
  field: {
    id: string;
    type: string;
    label: string;
    name: string;
    required: boolean;
    options?: string[];
  },
  values: Record<string, string | boolean>,
  setValues: (v: Record<string, string | boolean>) => void,
) {
  if (field.type === 'hidden') {
    return (
      <input
        key={field.id}
        type="hidden"
        value={String(values[field.name] ?? '')}
        onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
      />
    );
  }
  if (field.type === 'signature') {
    return (
      <SignaturePad
        key={field.id}
        label={field.label}
        required={field.required}
        value={String(values[field.name] ?? '')}
        onChange={(dataUrl) => setValues({ ...values, [field.name]: dataUrl })}
      />
    );
  }
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
  if (field.type === 'select' || field.type === 'radio') {
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
      type={
        field.type === 'email'
          ? 'email'
          : field.type === 'number'
            ? 'number'
            : field.type === 'date'
              ? 'date'
              : field.type === 'phone'
                ? 'tel'
                : 'text'
      }
      placeholder={field.label}
      required={field.required}
      value={String(values[field.name] ?? '')}
      onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
    />
  );
}

function SiteSearchView({ block }: { block: Extract<CmsBlock, { type: 'site_search' }> }) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const { data, isFetching } = trpc.websiteCms.public.search.useQuery(
    { query: submitted },
    { enabled: submitted.length > 0 },
  );

  return (
    <section className={`mx-auto max-w-2xl px-6 py-16 ${blockVisibilityClass(block)}`}>
      {block.title ? <h2 className="mb-6 text-center text-2xl font-bold">{block.title}</h2> : null}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
      >
        <input
          className="w-full rounded-lg border border-border px-3 py-2"
          placeholder={block.placeholder || 'Search pages…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>
      <div className="mt-6 space-y-3">
        {isFetching ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
        {submitted && !isFetching && !data?.length ? (
          <p className="text-sm text-muted-foreground">No results for “{submitted}”.</p>
        ) : null}
        {data?.map((hit) => (
          <Link
            key={hit.slug}
            href={hit.slug === 'home' ? '/' : `/${hit.slug}`}
            className="block rounded-xl border border-border p-4 hover:bg-muted/40"
          >
            <p className="font-semibold">{hit.title}</p>
            {hit.description ? (
              <p className="mt-1 text-sm text-muted-foreground">{hit.description}</p>
            ) : null}
          </Link>
        ))}
      </div>
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

function renderBlock(block: CmsBlock, editMode?: boolean) {
  if (!block.enabled) return null;
  let inner: ReactNode = null;
  switch (block.type) {
    case 'hero':
      inner = <HeroBlockView block={block} />;
      break;
    case 'preview_dashboard':
      inner = <PreviewDashboardView block={block} />;
      break;
    case 'feature_grid':
      inner = <FeatureGridView block={block} />;
      break;
    case 'cta':
      inner = <CtaView block={block} />;
      break;
    case 'pricing_table':
      inner = <PricingTableView block={block} />;
      break;
    case 'faq':
      inner = <FaqView block={block} />;
      break;
    case 'rich_text':
      inner = <RichTextView block={block} />;
      break;
    case 'spacer':
      inner = <SpacerView block={block} />;
      break;
    case 'divider':
      inner = <DividerView block={block} />;
      break;
    case 'custom_html':
      inner = <CustomHtmlView block={block} />;
      break;
    case 'image':
      inner = <ImageView block={block} />;
      break;
    case 'image_text':
      inner = <ImageTextView block={block} />;
      break;
    case 'video':
      inner = <VideoView block={block} />;
      break;
    case 'gallery':
      inner = <GalleryView block={block} />;
      break;
    case 'slideshow':
      inner = <SlideshowView block={block} />;
      break;
    case 'map':
      inner = <MapBlockView block={block} />;
      break;
    case 'calendar':
      inner = <CalendarView block={block} />;
      break;
    case 'testimonials':
      inner = <TestimonialsView block={block} />;
      break;
    case 'buttons':
      inner = <ButtonsView block={block} />;
      break;
    case 'contact_form':
      inner = <ContactFormView block={block} />;
      break;
    case 'collection_list':
      inner = <CollectionListView block={block} />;
      break;
    case 'site_search':
      inner = <SiteSearchView block={block} />;
      break;
    case 'stats':
      inner = (
        <PreviewDashboardView
          block={{
            ...block,
            type: 'preview_dashboard',
            stats: block.items,
            routeText: block.footerText,
          }}
        />
      );
      break;
    default:
      return null;
  }
  return (
    <BlockShell key={block.id} block={block} editMode={editMode}>
      {inner}
    </BlockShell>
  );
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
  editMode,
  forceBreakpoint,
  locale,
}: {
  page: CmsPage;
  globals: CmsSiteGlobals;
  editMode?: boolean;
  forceBreakpoint?: 'desktop' | 'tablet' | 'mobile';
  locale?: string | null;
}) {
  const branding = globals.branding;
  const primaryHsl = hexToHslComponents(branding.primaryColor);
  const accentHsl = hexToHslComponents(branding.accentColor);
  const [bp, setBp] = useState<'desktop' | 'tablet' | 'mobile'>(forceBreakpoint ?? 'desktop');
  const localized = applyCmsLocale(page, locale);
  const ordered = orderBlocksForBreakpoint(
    localized.blocks,
    localized.blockOrderByBreakpoint,
    forceBreakpoint ?? bp,
  );

  useEffect(() => {
    if (forceBreakpoint) {
      setBp(forceBreakpoint);
      return;
    }
    const sync = () => setBp(detectBreakpointWidth(window.innerWidth));
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [forceBreakpoint]);

  useEffect(() => {
    if (!editMode) return;
    window.parent?.postMessage({ type: 'yl-cms-preview-ready' }, '*');
  }, [editMode, localized.id]);

  const themePreset = globals.themePreset ?? 'default';
  const themeMode = globals.themeMode ?? 'light';
  const layout = globals.layoutTemplate ?? 'classic';
  const themeClass = [
    'mesh-bg min-h-screen',
    themeMode === 'dark' ? 'dark bg-slate-950 text-slate-50' : '',
    themePreset === 'midnight' ? 'cms-theme-midnight' : '',
    themePreset === 'forest' ? 'cms-theme-forest' : '',
    themePreset === 'snow' ? 'cms-theme-snow' : '',
    layout === 'centered' ? 'cms-layout-centered' : '',
    layout === 'minimal' ? 'cms-layout-minimal' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const locales = globals.availableLocales?.length
    ? globals.availableLocales
    : [globals.defaultLocale || 'en'];

  return (
    <div
      className={themeClass}
      data-cms-theme={themePreset}
      data-cms-layout={layout}
      style={
        {
          ...(primaryHsl ? { ['--primary' as string]: primaryHsl } : null),
          ...(accentHsl ? { ['--accent' as string]: accentHsl } : null),
          ...(themePreset === 'midnight'
            ? { ['--primary' as string]: '222 47% 31%', background: '#0b1220' }
            : null),
          ...(themePreset === 'forest'
            ? { ['--primary' as string]: '142 45% 28%', background: '#f3faf4' }
            : null),
          ...(themePreset === 'snow'
            ? { ['--primary' as string]: '199 89% 38%', background: '#f8fafc' }
            : null),
        } as CSSProperties
      }
    >
      {editMode ? (
        <div className="sticky top-0 z-50 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Preview edit mode — click a section to select it in the editor
        </div>
      ) : null}
      {locales.length > 1 && !editMode ? (
        <div className="flex justify-end gap-2 px-6 pt-3 text-xs">
          {locales.map((code) => (
            <Link
              key={code}
              href={`?lang=${code}`}
              className={`rounded border px-2 py-1 ${
                (locale || globals.defaultLocale || 'en') === code
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground'
              }`}
            >
              {code.toUpperCase()}
            </Link>
          ))}
        </div>
      ) : null}
      {globals.customHeadCss ? <style dangerouslySetInnerHTML={{ __html: globals.customHeadCss }} /> : null}
      {globals.gtmContainerId ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${globals.gtmContainerId.replace(/[^A-Z0-9-]/gi, '')}');`,
          }}
        />
      ) : null}
      {globals.metaPixelId ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${globals.metaPixelId.replace(/[^0-9]/g, '')}');fbq('track','PageView');`,
          }}
        />
      ) : null}
      <CmsNotices pageSlug={localized.slug} />
      <CmsMarketingChrome globals={globals} />
      <main className={layout === 'centered' ? 'mx-auto max-w-4xl' : layout === 'minimal' ? 'mx-auto max-w-5xl' : undefined}>
        {ordered.map((block) => renderBlock(block, editMode))}
      </main>
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
      {globals.customHeadJs ? (
        <script dangerouslySetInnerHTML={{ __html: globals.customHeadJs }} />
      ) : null}
    </div>
  );
}

export function CmsPageView({
  page,
  globals,
  editMode,
  forceBreakpoint,
  locale,
}: {
  page: CmsPage;
  globals: CmsSiteGlobals;
  editMode?: boolean;
  forceBreakpoint?: 'desktop' | 'tablet' | 'mobile';
  locale?: string | null;
}) {
  return (
    <TRPCProvider>
      <CmsPageViewInner
        page={page}
        globals={globals}
        editMode={editMode}
        forceBreakpoint={forceBreakpoint}
        locale={locale}
      />
    </TRPCProvider>
  );
}
