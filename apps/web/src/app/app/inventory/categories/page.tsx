'use client';

import { trpc } from '@/lib/trpc';
import { LoadingState } from '@/components/ui/states';

export default function CategoriesPage() {
  const { data, isLoading } = trpc.inventory360.categories.list.useQuery();
  if (isLoading) return <LoadingState />;
  const groups = [...new Set(data?.map((c) => c.group) ?? [])];
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group} className="card p-6">
          <h2 className="font-semibold capitalize">{group.replace(/_/g, ' ')}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {data?.filter((c) => c.group === group).map((c) => (
              <span key={c.id} className="rounded-full bg-muted px-3 py-1 text-sm">{c.name}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
