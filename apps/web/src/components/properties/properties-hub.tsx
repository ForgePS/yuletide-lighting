'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  formatPropertyAddress,
  installComplexityBadgeClass,
  INSTALL_COMPLEXITY_OPTIONS,
  labelInstallComplexity,
  labelPropertyProfileType,
  PROPERTY_PROFILE_TYPE_OPTIONS,
} from '@/lib/property-profile-utils';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { MapPin, Plus } from 'lucide-react';
import type { InstallComplexity, PropertyProfileType } from '@clcrm/types';

export function PropertiesHub() {
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyProfileType | ''>('');
  const [complexity, setComplexity] = useState<InstallComplexity | ''>('');

  const { data, isLoading } = trpc.customer360.properties.listAll.useQuery({
    search: search.trim() || undefined,
    propertyProfileType: propertyType || undefined,
    installComplexity: complexity || undefined,
  });

  const stats = useMemo(() => {
    const items = data ?? [];
    return {
      total: items.length,
      lift: items.filter((p) => p.liftRequired).length,
      highComplexity: items.filter((p) => p.installComplexity === 'high' || p.installComplexity === 'extreme').length,
    };
  }, [data]);

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Properties</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">Lift required</p>
          <p className="text-2xl font-bold">{stats.lift}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted-foreground">High / extreme complexity</p>
          <p className="text-2xl font-bold">{stats.highComplexity}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <input
          type="search"
          placeholder="Search address or customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-md"
        />
        <select className="input max-w-[180px]" value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyProfileType | '')}>
          <option value="">All types</option>
          {PROPERTY_PROFILE_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={complexity} onChange={(e) => setComplexity(e.target.value as InstallComplexity | '')}>
          <option value="">All complexity</option>
          {INSTALL_COMPLEXITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <Link href="/app/customers/new" className="btn-primary ml-auto">
          <Plus className="h-4 w-4" />
          New customer
        </Link>
      </div>

      {!data?.length ? (
        <EmptyState
          title="No property profiles yet"
          description="Add properties from a customer record to build intake profiles for faster estimates."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <Link
              key={`${p.customerId}-${p.id}`}
              href={`/app/customers/${p.customerId}/property/${p.id}`}
              className="card-hover block p-5"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold">{p.propertyName}</p>
                  <p className="text-sm text-primary">{p.customerName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatPropertyAddress(p)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{labelPropertyProfileType(p.propertyType)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${installComplexityBadgeClass(p.installComplexity)}`}>
                  {labelInstallComplexity(p.installComplexity)}
                </span>
                {(p.estimatedRooflineFeet ?? 0) > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{p.estimatedRooflineFeet} ft roofline</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
