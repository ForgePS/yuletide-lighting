import type { LucideIcon } from 'lucide-react';
import {
  Calendar,
  CreditCard,
  ImageIcon,
  MessageSquare,
  Package,
  Route,
  Sparkles,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  sparkles: Sparkles,
  'credit-card': CreditCard,
  package: Package,
  'message-square': MessageSquare,
  calendar: Calendar,
  image: ImageIcon,
  route: Route,
};

export function marketingIcon(name?: string | null): LucideIcon {
  if (!name) return Sparkles;
  return ICONS[name] ?? Sparkles;
}
