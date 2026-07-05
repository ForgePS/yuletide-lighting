'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CirclePlus,
  CreditCard,
  ExternalLink,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Rocket,
  Settings,
  Shield,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { CRM_PLATFORM_MODULES, type CrmPlatformModuleKey } from '@clcrm/types';
import { formatCurrency } from '@clcrm/ui';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { SubscriptionControlPanel, SubscriptionSummaryRowActions } from './subscription-control-panel';
import { CreatorPanel, CreatorStatCard, CreatorTabBar, healthStatusClass, statusBadgeClass } from './creator-ui';

export type CreatorConsoleTab =
  | 'overview'
  | 'platform'
  | 'subscriptions'
  | 'modules'
  | 'organizations'
  | 'users'
  | 'operations'
  | 'ecosystem';

const TABS = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'platform' as const, label: 'Platform Settings', icon: Settings },
  { id: 'subscriptions' as const, label: 'Subscriptions', icon: CreditCard },
  { id: 'modules' as const, label: 'Tenant Modules', icon: Layers },
  { id: 'organizations' as const, label: 'Organizations', icon: Building2 },
  { id: 'users' as const, label: 'Users', icon: Users },
  { id: 'operations' as const, label: 'Operations', icon: Rocket },
  { id: 'ecosystem' as const, label: 'Ecosystem', icon: ShieldCheck },
];

const TAB_ROUTES: Record<CreatorConsoleTab, string> = {
  overview: '/creator',
  platform: '/creator/settings',
  subscriptions: '/creator/subscriptions',
  modules: '/creator/modules',
  organizations: '/creator/organizations',
  users: '/creator/users',
  operations: '/creator/operations',
  ecosystem: '/creator/ecosystem',
};

export function CreatorConsole({ initialTab = 'overview' }: { initialTab?: CreatorConsoleTab }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<CreatorConsoleTab>(initialTab);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const { data: dashboard } = trpc.creator360.dashboard.useQuery();
  const { data: settings } = trpc.creator360.settings.get.useQuery();
  const { data: orgList } = trpc.creator360.organizations.list.useQuery({ limit: 100 });

  const productName = settings?.productName ?? 'Yuletide CRM';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Admin</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage {productName} platform-wide settings, tenant subscriptions, modules, and operations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings?.hostingUrl ? (
            <a href={settings.hostingUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              Open hosted app
            </a>
          ) : null}
          {settings?.marketingUrl ? (
            <a href={settings.marketingUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center gap-2 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              Marketing site
            </a>
          ) : null}
        </div>
      </div>

      {message ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p>
      ) : null}

      <CreatorPanel title="Platform hierarchy" icon={ShieldCheck}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{settings?.productLabel ?? 'Platform Admin'}</p>
            <ul className="mt-3 space-y-2 border-l-2 border-slate-200 pl-4">
              <li className="font-semibold text-primary">
                {productName}
                <span className="ml-2 text-xs font-normal text-muted-foreground">· platform root</span>
              </li>
              {(orgList?.items ?? []).slice(0, 8).map((org) => (
                <li key={org.id} className="text-sm text-muted-foreground">
                  <Link href={`/creator/organizations/${org.id}`} className="hover:text-primary hover:underline">
                    {org.companyName}
                  </Link>
                </li>
              ))}
              {(orgList?.total ?? 0) > 8 ? (
                <li className="text-xs text-muted-foreground">+ {(orgList?.total ?? 0) - 8} more tenants</li>
              ) : null}
            </ul>
          </div>
          <Link href="/app" className="btn-secondary text-xs">← Back to tenant app</Link>
        </div>
      </CreatorPanel>

      {dashboard ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CreatorStatCard label="Organizations" value={String(dashboard.totalOrganizations)} sub={`+${dashboard.newOrganizationsThisMonth} this month`} />
          <CreatorStatCard label="Active subscriptions" value={String(dashboard.activeSubscriptions)} sub={`${dashboard.trialingOrganizations} trialing`} />
          <CreatorStatCard label="Est. MRR" value={formatCurrency(dashboard.estimatedMrrCents)} sub={`ARR ${formatCurrency(dashboard.estimatedArrCents)}`} />
          <CreatorStatCard label="Platform modules" value={String(settings?.availableModules?.length ?? CRM_PLATFORM_MODULES.length)} sub={`${dashboard.totalUsers} total users`} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-muted/50" />)}
        </div>
      )}

      <CreatorTabBar
        tabs={TABS}
        active={activeTab}
        onChange={(id) => {
          const tab = id as CreatorConsoleTab;
          setActiveTab(tab);
          router.push(TAB_ROUTES[tab]);
        }}
      />

      {activeTab === 'overview' ? <OverviewTab onNavigate={setActiveTab} /> : null}
      {activeTab === 'platform' ? <PlatformTab onMessage={setMessage} /> : null}
      {activeTab === 'subscriptions' ? <SubscriptionsTab /> : null}
      {activeTab === 'modules' ? <ModulesTab onMessage={setMessage} /> : null}
      {activeTab === 'organizations' ? <OrganizationsTab onMessage={setMessage} onNavigate={setActiveTab} /> : null}
      {activeTab === 'users' ? <UsersTab /> : null}
      {activeTab === 'operations' ? <OperationsTab /> : null}
      {activeTab === 'ecosystem' ? <EcosystemTab /> : null}
    </div>
  );
}

function OverviewTab({ onNavigate }: { onNavigate: (tab: CreatorConsoleTab) => void }) {
  const { data: dashboard } = trpc.creator360.dashboard.useQuery();
  const { data: audit } = trpc.creator360.audit.list.useQuery({ limit: 8 });
  const { data: payments } = trpc.creator360.billing.recentPayments.useQuery({ limit: 5 });

  if (!dashboard) return <div className="card h-48 animate-pulse bg-muted/50" />;

  const metrics = [
    { label: 'New this week', value: String(dashboard.newOrganizationsThisWeek) },
    { label: 'Locked', value: String(dashboard.lockedOrganizations) },
    { label: 'Past due', value: String(dashboard.pastDueOrganizations) },
    { label: 'Payments (30d)', value: formatCurrency(dashboard.paymentsLast30DaysCents) },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <CreatorPanel title="Platform metrics" icon={LayoutDashboard}>
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-lg font-bold">{m.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['platform', 'subscriptions', 'organizations', 'operations'] as CreatorConsoleTab[]).map((tab) => (
            <button key={tab} type="button" className="btn-secondary text-xs capitalize" onClick={() => onNavigate(tab)}>
              {tab.replace(/_/g, ' ')} →
            </button>
          ))}
        </div>
      </CreatorPanel>

      <CreatorPanel title="Recent activity" icon={UserCog}>
        {!audit?.length ? <p className="text-sm text-muted-foreground">No audit entries yet.</p> : (
          <ul className="space-y-2">
            {audit.map((entry) => (
              <li key={entry.id} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.organizationName ?? 'Platform'} · {entry.actorEmail} · {entry.createdAt.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        {payments && payments.length > 0 ? (
          <div className="mt-4 border-t pt-4">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recent payments</p>
            <ul className="space-y-1 text-sm">
              {payments.map((p) => (
                <li key={`${p.organizationId}-${p.id}`} className="flex justify-between">
                  <span>{p.organizationName}</span>
                  <span className="font-medium">{formatCurrency(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CreatorPanel>
    </div>
  );
}

function PlatformTab({ onMessage }: { onMessage: (msg: string) => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = trpc.creator360.settings.get.useQuery();
  const update = trpc.creator360.settings.update.useMutation({
    onSuccess: () => { toast('Platform settings saved', 'success'); onMessage('Platform configuration saved.'); refetch(); },
    onError: (e) => toast(e.message, 'error'),
  });

  const [form, setForm] = useState({
    productName: 'Yuletide CRM',
    productLabel: 'Platform Admin',
    tagline: '',
    platformLogoUrl: '',
    version: '1.0.0',
    status: 'active' as 'active' | 'maintenance' | 'beta',
    marketingUrl: '',
    hostingUrl: '',
    docsUrl: '',
    availableModules: [] as CrmPlatformModuleKey[],
    signupEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: '',
    defaultTrialDays: 14,
    supportEmail: '',
    announcementBanner: '',
    platformCreatorEmails: [] as string[],
  });

  useEffect(() => {
    if (data) {
      setForm({
        productName: data.productName,
        productLabel: data.productLabel,
        tagline: data.tagline,
        platformLogoUrl: data.platformLogoUrl ?? '',
        version: data.version,
        status: data.status,
        marketingUrl: data.marketingUrl ?? '',
        hostingUrl: data.hostingUrl ?? '',
        docsUrl: data.docsUrl ?? '',
        availableModules: data.availableModules ?? [],
        signupEnabled: data.signupEnabled,
        maintenanceMode: data.maintenanceMode,
        maintenanceMessage: data.maintenanceMessage,
        defaultTrialDays: data.defaultTrialDays,
        supportEmail: data.supportEmail,
        announcementBanner: data.announcementBanner ?? '',
        platformCreatorEmails: data.platformCreatorEmails ?? [],
      });
    }
  }, [data]);

  function togglePlatformModule(key: CrmPlatformModuleKey) {
    setForm((prev) => ({
      ...prev,
      availableModules: prev.availableModules.includes(key)
        ? prev.availableModules.filter((k) => k !== key)
        : [...prev.availableModules, key],
    }));
  }

  if (isLoading || !data) return <div className="card h-64 animate-pulse bg-muted/50" />;

  return (
    <CreatorPanel title="Platform settings" icon={Settings}>
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          update.mutate({
            ...form,
            platformLogoUrl: form.platformLogoUrl || null,
            marketingUrl: form.marketingUrl || null,
            hostingUrl: form.hostingUrl || null,
            docsUrl: form.docsUrl || null,
            announcementBanner: form.announcementBanner || null,
            availableModules: form.availableModules.length ? form.availableModules : CRM_PLATFORM_MODULES.map((m) => m.key),
            platformCreatorEmails: form.platformCreatorEmails,
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">Platform name<input className="input mt-1 w-full" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} /></label>
          <label className="block text-sm">Product label<input className="input mt-1 w-full" value={form.productLabel} onChange={(e) => setForm({ ...form, productLabel: e.target.value })} /></label>
          <label className="block text-sm md:col-span-2">Tagline<input className="input mt-1 w-full" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></label>
          <label className="block text-sm">Version<input className="input mt-1 w-full" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></label>
          <label className="block text-sm">Status
            <select className="input mt-1 w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}>
              <option value="active">Active</option>
              <option value="beta">Beta</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </label>
          <label className="block text-sm">Support email<input className="input mt-1 w-full" type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} /></label>
          <label className="block text-sm">Logo URL<input className="input mt-1 w-full" value={form.platformLogoUrl} onChange={(e) => setForm({ ...form, platformLogoUrl: e.target.value })} /></label>
          <label className="block text-sm">Marketing URL<input className="input mt-1 w-full" value={form.marketingUrl} onChange={(e) => setForm({ ...form, marketingUrl: e.target.value })} /></label>
          <label className="block text-sm">Hosted app URL<input className="input mt-1 w-full" value={form.hostingUrl} onChange={(e) => setForm({ ...form, hostingUrl: e.target.value })} /></label>
          <label className="block text-sm">Docs URL<input className="input mt-1 w-full" value={form.docsUrl} onChange={(e) => setForm({ ...form, docsUrl: e.target.value })} /></label>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Platform-wide modules</p>
          <p className="mb-3 text-xs text-muted-foreground">Modules available to enable per tenant.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CRM_PLATFORM_MODULES.map((mod) => (
              <label key={mod.key} className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/30">
                <input type="checkbox" checked={form.availableModules.includes(mod.key)} onChange={() => togglePlatformModule(mod.key)} className="mt-0.5" />
                <span>
                  <span className="font-medium">{mod.label}</span>
                  <span className="block text-xs text-muted-foreground">{mod.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <p className="text-sm font-medium">Platform operators</p>
          <p className="text-xs text-muted-foreground">
            Emails with Creator Console access (multi-tenant admin). One per line. Env var PLATFORM_CREATOR_EMAILS also grants access.
          </p>
          <textarea
            className="input w-full font-mono text-sm"
            rows={4}
            placeholder="you@company.com&#10;ops@company.com"
            value={form.platformCreatorEmails.join('\n')}
            onChange={(e) =>
              setForm({
                ...form,
                platformCreatorEmails: e.target.value
                  .split(/[\n,;]+/)
                  .map((v) => v.trim().toLowerCase())
                  .filter(Boolean),
              })
            }
          />
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.signupEnabled} onChange={(e) => setForm({ ...form, signupEnabled: e.target.checked })} />Allow new sign-ups</label>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={form.maintenanceMode} onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })} />Maintenance mode</label>
          <label className="block text-sm">Maintenance message<textarea className="input mt-1 w-full" rows={2} value={form.maintenanceMessage} onChange={(e) => setForm({ ...form, maintenanceMessage: e.target.value })} /></label>
          <label className="block text-sm">Default trial days<input className="input mt-1 w-32" type="number" min={0} max={90} value={form.defaultTrialDays} onChange={(e) => setForm({ ...form, defaultTrialDays: Number(e.target.value) })} /></label>
          <label className="block text-sm">Announcement banner<input className="input mt-1 w-full" value={form.announcementBanner} onChange={(e) => setForm({ ...form, announcementBanner: e.target.value })} placeholder="Optional banner shown to all tenants" /></label>
        </div>

        <button type="submit" className="btn-primary" disabled={update.isPending}>Save platform settings</button>
      </form>
    </CreatorPanel>
  );
}

function SubscriptionsTab() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'locked' | 'none' | 'no_access'>('all');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const { data, isLoading, refetch } = trpc.creator360.subscriptions.list.useQuery({ search: search || undefined, status });
  const { data: selectedOrg, refetch: refetchSelected } = trpc.creator360.organizations.get.useQuery(
    { organizationId: selectedOrgId! },
    { enabled: !!selectedOrgId },
  );

  const metrics = useMemo(() => {
    const items = data?.items ?? [];
    return {
      total: items.length,
      active: items.filter((o) => o.subscriptionStatus === 'active').length,
      trialing: items.filter((o) => o.subscriptionStatus === 'trialing').length,
      mrr: items.reduce((s, o) => s + o.mrrCents, 0),
    };
  }, [data?.items]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <CreatorStatCard label="Subscriptions" value={String(data?.total ?? metrics.total)} />
        <CreatorStatCard label="Active" value={String(metrics.active)} />
        <CreatorStatCard label="Trialing" value={String(metrics.trialing)} />
        <CreatorStatCard label="Listed MRR" value={formatCurrency(metrics.mrr)} />
      </div>

      <CreatorPanel title="Customer subscriptions" icon={CreditCard}>
        <div className="mb-4 flex flex-wrap gap-3">
          <input className="input min-w-[220px]" placeholder="Search company, Stripe ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="locked">Locked</option>
            <option value="no_access">No access</option>
            <option value="canceled">Canceled</option>
          </select>
          <button type="button" className="btn-secondary" onClick={() => refetch()}>Refresh</button>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
                {!isLoading && data?.items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No subscriptions found.</td></tr>}
                {data?.items.map((org) => (
                  <tr key={org.id} className={`border-b last:border-0 hover:bg-muted/20 ${selectedOrgId === org.id ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-medium hover:text-primary hover:underline" onClick={() => setSelectedOrgId(org.id)}>
                        {org.companyName}
                      </button>
                      <p className="text-xs text-muted-foreground">{org.userCount} users · {formatCurrency(org.mrrCents)} MRR</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(org.subscriptionStatus, org.isLocked)}`}>
                        {org.isLocked ? 'locked' : org.subscriptionStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">{org.planLabel ?? '—'}</td>
                    <td className="px-4 py-3"><span className={org.hasAccess ? 'text-emerald-700' : 'text-red-700'}>{org.hasAccess ? 'Yes' : 'No'}</span></td>
                    <td className="px-4 py-3"><SubscriptionSummaryRowActions org={org} onUpdated={refetch} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="min-w-0">
            {selectedOrg ? (
              <SubscriptionControlPanel org={selectedOrg} compact onUpdated={() => { refetchSelected(); refetch(); }} />
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border p-6 text-sm text-muted-foreground">
                Select a company to manage its subscription
              </div>
            )}
          </div>
        </div>
      </CreatorPanel>
    </div>
  );
}

function ModulesTab({ onMessage }: { onMessage: (msg: string) => void }) {
  const { toast } = useToast();
  const { data: orgList } = trpc.creator360.organizations.list.useQuery({ limit: 100 });
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [enabledModules, setEnabledModules] = useState<CrmPlatformModuleKey[]>([]);

  const { data: modules, refetch } = trpc.creator360.modules.get.useQuery(
    { organizationId: selectedOrgId },
    { enabled: !!selectedOrgId },
  );

  useEffect(() => {
    if (orgList?.items.length && !selectedOrgId) setSelectedOrgId(orgList.items[0]!.id);
  }, [orgList, selectedOrgId]);

  useEffect(() => {
    if (modules) setEnabledModules(modules.enabledModules);
  }, [modules]);

  const update = trpc.creator360.modules.update.useMutation({
    onSuccess: () => { toast('Modules saved', 'success'); onMessage('Tenant modules updated.'); refetch(); },
    onError: (e) => toast(e.message, 'error'),
  });

  const available = modules?.availableModules ?? [];

  function toggleModule(key: CrmPlatformModuleKey) {
    setEnabledModules((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key],
    );
  }

  return (
    <CreatorPanel title="Tenant module controls" icon={Layers}>
      <p className="mb-4 text-sm text-muted-foreground">
        Turn CRM modules on or off for each tenant organization. Only modules enabled at the platform level are shown.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          Organization
          <select className="input mt-1 min-w-[240px]" value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)}>
            {(orgList?.items ?? []).map((org) => (
              <option key={org.id} value={org.id}>{org.companyName}</option>
            ))}
          </select>
        </label>
        <button type="button" className="btn-secondary text-xs" onClick={() => setEnabledModules([...available])}>Enable all</button>
        <button type="button" className="btn-secondary text-xs" onClick={() => setEnabledModules([])}>Disable all</button>
        <button
          type="button"
          className="btn-primary text-xs"
          disabled={!selectedOrgId || update.isPending}
          onClick={() => update.mutate({ organizationId: selectedOrgId, enabledModules })}
        >
          Save modules
        </button>
      </div>
      {!modules ? (
        <p className="text-sm text-muted-foreground">Select an organization.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CRM_PLATFORM_MODULES.filter((m) => available.includes(m.key)).map((mod) => (
            <label key={mod.key} className="flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/30">
              <input type="checkbox" checked={enabledModules.includes(mod.key)} onChange={() => toggleModule(mod.key)} className="mt-0.5" />
              <span>
                <span className="font-medium">{mod.label}</span>
                <span className="block text-xs text-muted-foreground">{mod.description}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </CreatorPanel>
  );
}

function OrganizationsTab({
  onMessage,
  onNavigate,
}: {
  onMessage: (msg: string) => void;
  onNavigate: (tab: CreatorConsoleTab) => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'locked' | 'none'>('all');
  const [provisionForm, setProvisionForm] = useState({ companyName: '', ownerEmail: '', trialDays: 14, note: '' });
  const { data, isLoading, refetch } = trpc.creator360.organizations.list.useQuery({ search: search || undefined, status });
  const provision = trpc.creator360.provision.useMutation({
    onSuccess: (result) => {
      const inviteNote = result.ownerInviteSent ? ' Owner invite sent.' : '';
      toast(`Provisioned ${result.companyName}`, 'success');
      onMessage(`Created tenant ${result.companyName}. Trial ends ${result.trialEndsAt.toLocaleDateString()}.${inviteNote}`);
      setProvisionForm({ companyName: '', ownerEmail: '', trialDays: 14, note: '' });
      refetch();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  return (
    <div className="space-y-6">
      <CreatorPanel title="Registered organizations" icon={GraduationCap}>
        <div className="mb-4 flex flex-wrap gap-3">
          <input className="input min-w-[220px]" placeholder="Search name or ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="locked">Locked</option>
            <option value="canceled">Canceled</option>
          </select>
          <button type="button" className="btn-secondary" onClick={() => refetch()}>Refresh</button>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Users</th>
                <th className="px-4 py-3">Customers</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center">Loading…</td></tr>}
              {!isLoading && data?.items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No organizations found.</td></tr>}
              {data?.items.map((org) => (
                <tr key={org.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link href={`/creator/organizations/${org.id}`} className="font-medium hover:text-primary hover:underline">{org.companyName}</Link>
                    <p className="text-xs text-muted-foreground">{org.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(org.subscriptionStatus, org.isLocked)}`}>
                      {org.isLocked ? 'locked' : org.subscriptionStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">{org.userCount}</td>
                  <td className="px-4 py-3">{org.customerCount}</td>
                  <td className="px-4 py-3 text-muted-foreground">{org.createdAt.toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/creator/organizations/${org.id}`} className="text-xs text-primary hover:underline">Manage</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CreatorPanel>

      <CreatorPanel title="Provision new organization" icon={CirclePlus}>
        <p className="mb-4 text-sm text-muted-foreground">
          Creates a new tenant with trial subscription. If you enter an owner email, they receive an invite to join as owner.
        </p>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            provision.mutate({
              companyName: provisionForm.companyName,
              ownerEmail: provisionForm.ownerEmail || undefined,
              trialDays: provisionForm.trialDays,
              note: provisionForm.note || undefined,
            });
          }}
        >
          <label className="block text-sm">Company name<input required className="input mt-1 w-full" value={provisionForm.companyName} onChange={(e) => setProvisionForm({ ...provisionForm, companyName: e.target.value })} /></label>
          <label className="block text-sm">Owner email<input className="input mt-1 w-full" type="email" placeholder="owner@their-company.com" value={provisionForm.ownerEmail} onChange={(e) => setProvisionForm({ ...provisionForm, ownerEmail: e.target.value })} /></label>
          <label className="block text-sm">Trial days<input className="input mt-1 w-32" type="number" min={0} max={365} value={provisionForm.trialDays} onChange={(e) => setProvisionForm({ ...provisionForm, trialDays: Number(e.target.value) })} /></label>
          <label className="block text-sm md:col-span-2">Note<textarea className="input mt-1 w-full" rows={2} value={provisionForm.note} onChange={(e) => setProvisionForm({ ...provisionForm, note: e.target.value })} /></label>
          <div className="flex gap-2 md:col-span-2">
            <button type="submit" className="btn-primary" disabled={provision.isPending}>Create tenant</button>
            <button type="button" className="btn-secondary" onClick={() => onNavigate('modules')}>Configure modules →</button>
          </div>
        </form>
      </CreatorPanel>
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = trpc.creator360.users.list.useQuery({ search: search || undefined, limit: 100 });

  return (
    <CreatorPanel title="Cross-tenant users" icon={Users}>
      <input className="input mb-4 max-w-md" placeholder="Search email or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={4} className="px-4 py-8 text-center">Loading…</td></tr>}
            {data?.items.map((user) => (
              <tr key={user.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.firstName} {user.lastName}</p>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/creator/organizations/${user.organizationId}`} className="hover:text-primary hover:underline">{user.organizationName}</Link>
                </td>
                <td className="px-4 py-3 capitalize">{user.role.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CreatorPanel>
  );
}

function OperationsTab() {
  const { toast } = useToast();
  const { data: audit } = trpc.creator360.audit.list.useQuery({ limit: 50 });
  const { data: payments } = trpc.creator360.billing.recentPayments.useQuery({ limit: 30 });
  const { data: creators } = trpc.creator360.operations.creators.useQuery();
  const health = trpc.creator360.operations.healthChecks.useQuery();

  async function runHealthChecks() {
    const result = await health.refetch();
    if (result.data) toast(`Ran ${result.data.length} health checks`, 'success');
  }

  return (
    <div className="space-y-6">
      <CreatorPanel
        title="Platform health checks"
        icon={Rocket}
        actions={
          <button type="button" className="btn-primary text-xs" onClick={() => void runHealthChecks()} disabled={health.isFetching}>
            {health.isFetching ? 'Running…' : 'Run checks'}
          </button>
        }
      >
        {!health.data?.length ? (
          <p className="text-sm text-muted-foreground">Click Run checks to validate platform configuration.</p>
        ) : (
          <ul className="space-y-2">
            {health.data.map((check) => (
              <li key={check.id} className={`rounded-lg border px-4 py-3 text-sm ${healthStatusClass(check.status)}`}>
                <p className="font-semibold">{check.label}</p>
                <p className="mt-1 text-xs opacity-90">{check.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </CreatorPanel>

      <CreatorPanel title="Platform creators" icon={Shield}>
        {!creators?.length ? (
          <p className="text-sm text-muted-foreground">No creator accounts matched PLATFORM_CREATOR_EMAILS / PLATFORM_CREATOR_UIDS.</p>
        ) : (
          <ul className="space-y-2">
            {creators.map((creator) => (
              <li key={creator.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold">{creator.firstName} {creator.lastName}</p>
                  <p className="text-xs text-muted-foreground">{creator.email}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CreatorPanel>

      <div className="grid gap-6 lg:grid-cols-2">
        <CreatorPanel title="Recent payments" icon={CreditCard}>
          {!payments?.length ? <p className="text-sm text-muted-foreground">No payments recorded.</p> : (
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li key={`${p.organizationId}-${p.id}`} className="flex justify-between border-b py-2 last:border-0">
                  <Link href={`/creator/organizations/${p.organizationId}`} className="hover:text-primary hover:underline">{p.organizationName}</Link>
                  <span className="font-medium">{formatCurrency(p.amountCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </CreatorPanel>

        <CreatorPanel title="Audit log" icon={UserCog}>
          {!audit?.length ? <p className="text-sm text-muted-foreground">No audit entries yet.</p> : (
            <ul className="max-h-80 space-y-2 overflow-y-auto text-sm">
              {audit.map((entry) => (
                <li key={entry.id} className="rounded-lg border px-3 py-2">
                  <p className="font-medium capitalize">{entry.action.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-foreground">{entry.organizationName ?? 'Platform'} · {entry.actorEmail}</p>
                  <p className="text-xs text-muted-foreground">{entry.createdAt.toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </CreatorPanel>
      </div>
    </div>
  );
}

function EcosystemTab() {
  const { data: settings } = trpc.creator360.settings.get.useQuery();

  const links = [
    { label: 'Hosted application', url: settings?.hostingUrl, description: 'Production Firebase Hosting URL' },
    { label: 'Marketing site', url: settings?.marketingUrl, description: 'Public marketing and pricing pages' },
    { label: 'Documentation', url: settings?.docsUrl, description: 'Platform documentation' },
    { label: 'Support', url: settings?.supportEmail ? `mailto:${settings.supportEmail}` : null, description: settings?.supportEmail ?? 'Support email' },
  ];

  return (
    <CreatorPanel title="Yuletide ecosystem" icon={ShieldCheck}>
      <p className="mb-4 text-sm text-muted-foreground">
        External links and platform identity for {settings?.productName ?? 'Yuletide CRM'}.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {links.map((link) => (
          <div key={link.label} className="rounded-lg border p-4">
            <p className="font-semibold">{link.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{link.description}</p>
            {link.url ? (
              <a href={link.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                Open <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Not configured</p>
            )}
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg bg-slate-950 p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{settings?.productLabel ?? 'Platform Admin'}</p>
        <p className="mt-2 text-2xl font-bold">{settings?.productName ?? 'Yuletide CRM'}</p>
        <p className="mt-1 text-sm text-slate-300">{settings?.tagline}</p>
        <p className="mt-3 text-xs text-slate-500">Version {settings?.version ?? '1.0.0'} · Status {settings?.status ?? 'active'}</p>
      </div>
    </CreatorPanel>
  );
}
