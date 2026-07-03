import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@clcrm/ui';

type LogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  src?: string;
  /** Icon-only mark (house illustration) vs full wordmark */
  variant?: 'full' | 'mark';
  priority?: boolean;
  onClick?: () => void;
};

const sizes = {
  full: { width: 180, height: 72, markHeight: 48 },
  mark: { width: 48, height: 48, markHeight: 48 },
};

export function Logo({
  href = '/',
  className,
  imageClassName,
  src = '/logo.png',
  variant = 'full',
  priority = false,
  onClick,
}: LogoProps) {
  const { width, height, markHeight } = sizes[variant];
  const imgHeight = variant === 'mark' ? markHeight : height;

  const image = (
    <Image
      src={src}
      alt="Yuletide Lighting Co."
      width={width}
      height={imgHeight}
      priority={priority}
      className={cn('h-auto w-auto object-contain object-left', imageClassName)}
      style={{ height: imgHeight, width: 'auto', maxWidth: width }}
    />
  );

  if (!href) {
    return <div className={cn('inline-flex shrink-0 items-center', className)}>{image}</div>;
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn('inline-flex shrink-0 items-center transition-opacity hover:opacity-90', className)}
    >
      {image}
    </Link>
  );
}
