'use client';

import Link from 'next/link';
import { cn } from '@clcrm/ui';
import type { CSSProperties } from 'react';
import { logoDisplayUrl } from '@clcrm/types';
import { AuthenticatedImage } from '@/components/authenticated-image';

const DEFAULT_LOGO = '/logo.svg';

type SidebarLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  imageStyle?: CSSProperties;
  src?: string | null;
  alt?: string;
  onClick?: () => void;
};

function isRemoteOrStorageLogo(value: string | null | undefined) {
  if (!value) return false;
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('/api/files') ||
    value.startsWith('organizations/')
  );
}

export function SidebarLogo({
  href = '/app',
  className,
  imageClassName,
  imageStyle,
  src,
  alt = 'Yuletide Lighting Co.',
  onClick,
}: SidebarLogoProps) {
  const resolved = logoDisplayUrl(src) || src || DEFAULT_LOGO;
  const useAuthImage = isRemoteOrStorageLogo(src);

  const fallback = (
    <img
      src={DEFAULT_LOGO}
      alt={alt}
      className={cn('h-auto w-auto max-w-full object-contain', imageClassName)}
      style={imageStyle}
    />
  );

  const image = useAuthImage ? (
    <span className="inline-flex max-w-full" style={imageStyle}>
      <AuthenticatedImage
        value={src}
        alt={alt}
        className={cn('h-full w-auto max-w-full object-contain', imageClassName)}
        fallback={fallback}
      />
    </span>
  ) : (
    <img
      src={resolved.startsWith('/') ? resolved : DEFAULT_LOGO}
      alt={alt}
      className={cn('h-auto w-auto max-w-full object-contain', imageClassName)}
      style={imageStyle}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.getAttribute('src') === DEFAULT_LOGO) return;
        img.setAttribute('src', DEFAULT_LOGO);
      }}
    />
  );

  if (!href) {
    return <div className={cn('inline-flex max-w-full shrink-0 items-center', className)}>{image}</div>;
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn('inline-flex max-w-full shrink-0 items-center transition-opacity hover:opacity-90', className)}
    >
      {image}
    </Link>
  );
}
