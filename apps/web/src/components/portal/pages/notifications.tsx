'use client';

import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { mapLegacyPortalPathToAppPath } from '@/lib/portal-token-entry';
import { portalAppPath, portalSessionInput } from '@/lib/portal-paths';
import { formatDate } from '@clcrm/ui';
import { PortalAuthedFrame } from '@/components/portal/portal-shell';
import { LoadingState } from '@/components/ui/states';

function resolveActionHref(actionUrl?: string | null) {
  if (!actionUrl || actionUrl === '#') return null;
  if (
    actionUrl.startsWith('http') ||
    actionUrl.startsWith('/p/') ||
    actionUrl.startsWith('/pay/') ||
    actionUrl.startsWith('/a/') ||
    actionUrl.startsWith('/m/') ||
    actionUrl.startsWith('/review/')
  ) {
    return actionUrl;
  }
  if (actionUrl.startsWith('#')) return `${portalAppPath()}${actionUrl}`;
  if (actionUrl.startsWith('/portal/app')) return actionUrl;
  if (actionUrl.startsWith('/portal/')) return mapLegacyPortalPathToAppPath(actionUrl) ?? actionUrl;
  if (actionUrl.startsWith('/')) return `${portalAppPath()}${actionUrl}`;
  return portalAppPath(actionUrl);
}

export function PortalNotificationsPage() {
  return (
    <PortalAuthedFrame title="Notifications">
      {({ enabledFeatures }) => <NotificationsBody />}
    </PortalAuthedFrame>
  );
}

function NotificationsBody() {
  const utils = trpc.useUtils();
  const { data, isLoading, isError } = trpc.portal360.public.notifications.useQuery({
    ...portalSessionInput,
    limit: 50,
  });
  const markRead = trpc.portal360.public.markNotificationRead.useMutation({
    onSuccess: () => {
      utils.portal360.public.notifications.invalidate(portalSessionInput);
      utils.portal360.public.dashboard.invalidate(portalSessionInput);
    },
  });
  const markAll = trpc.portal360.public.markAllNotificationsRead.useMutation({
    onSuccess: () => {
      utils.portal360.public.notifications.invalidate(portalSessionInput);
      utils.portal360.public.dashboard.invalidate(portalSessionInput);
    },
  });

  if (isLoading) return <LoadingState message="Loading notifications..." />;
  if (isError) return <p className="text-sm text-red-600">Could not load notifications.</p>;
  if (!data?.length) {
    return (
      <p className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
        No notifications yet.
      </p>
    );
  }

  const unread = data.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-4">
      {unread > 0 && (
        <button
          type="button"
          className="btn-secondary text-sm"
          disabled={markAll.isPending}
          onClick={() => markAll.mutate(portalSessionInput)}
        >
          Mark all read
        </button>
      )}
      <ul className="space-y-3">
        {data.map((n) => {
          const href = resolveActionHref(n.actionUrl);
          return (
            <li
              key={n.id}
              className={`rounded-2xl border p-5 shadow-sm ${n.readAt ? 'border-stone-200 bg-white' : 'border-red-100 bg-red-50/40'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900">{n.title}</p>
                  <p className="mt-1 text-sm text-stone-600">{n.body}</p>
                  <p className="mt-2 text-xs text-stone-400">{formatDate(n.createdAt)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {href && (
                    <Link href={href} className="btn-primary text-sm">
                      Open
                    </Link>
                  )}
                  {!n.readAt && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() =>
                        markRead.mutate({ ...portalSessionInput, notificationId: n.id })
                      }
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
