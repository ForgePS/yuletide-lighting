'use client';

import { useRouter } from 'next/navigation';
import { PillSelect } from './pill-select';

export type SectionNavItem = { href: string; label: string };

type SectionNavProps = {
  tabs: SectionNavItem[];
  pathname: string;
  isActive: (tab: SectionNavItem, pathname: string) => boolean;
  extra?: React.ReactNode;
};

export function SectionNav({ tabs, pathname, isActive, extra }: SectionNavProps) {
  const router = useRouter();
  const activeTab = tabs.find((tab) => isActive(tab, pathname)) ?? tabs[0];

  return (
    <div className="space-y-3">
      <PillSelect
        label="Section"
        value={activeTab?.href ?? ''}
        onChange={(href) => router.push(href)}
        options={tabs.map((tab) => ({ value: tab.href, label: tab.label }))}
        className="max-w-md"
      />
      {extra}
    </div>
  );
}
