import Link from 'next/link';
import { cn } from '@clcrm/ui';

type SidebarLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  onClick?: () => void;
};

export function SidebarLogo({
  href = '/app',
  className,
  imageClassName,
  onClick,
}: SidebarLogoProps) {
  const image = (
    <img
      src="/logo.png"
      alt="Yuletide Lighting Co."
      className={cn('h-auto w-auto object-contain object-left', imageClassName)}
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
