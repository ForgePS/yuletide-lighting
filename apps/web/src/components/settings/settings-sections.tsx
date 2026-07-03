'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/firebase-auth';
import { roleLabel } from '@/lib/settings-utils';
import { FormField, KpiGrid, LogoUploadField, SaveButton, SettingsError, SettingsLoading, SettingsSection, ToggleField, useSettingsSave } from './settings-widgets';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { InvoiceLayoutPreview, ProposalLayoutPreview } from './document-layout-preview';

function settingsErrorMessage(error: { data?: { code?: string } | null; message?: string } | null | undefined) {
  const code = error?.data?.code;
  const message = error?.message;
  if (message === 'SUBSCRIPTION_LOCKED') {
    return 'Your subscription is inactive. Open Subscription in settings to renew and restore access.';
  }
  if (code === 'FORBIDDEN') return 'You need office or admin access to view settings.';
  if (code === 'UNAUTHORIZED') return 'Could not verify your sign-in. Try signing out and back in.';
  if (message && message !== 'UNAUTHORIZED') return message;
  return 'Could not load settings dashboard.';
}

export function SettingsDashboardPage() {
  const { idToken, loading: authLoading } = useAuth();
  const ready = !authLoading && !!idToken;
  const { data, isLoading, isError, error, refetch } = trpc.settings360.dashboard.useQuery(undefined, {
    enabled: ready,
    staleTime: 120_000,
    retry: 1,
  });
  const createBackup = trpc.settings360.createBackup.useMutation({ onSuccess: () => refetch() });
  const { data: auditLogs } = trpc.settings360.auditLogs.useQuery({ limit: 5 }, { enabled: ready && !!data, staleTime: 120_000 });
  const { data: flags, refetch: refetchFlags } = trpc.settings360.featureFlags.useQuery(undefined, { enabled: ready && !!data, staleTime: 120_000 });
  const toggleFlag = trpc.settings360.toggleFeatureFlag.useMutation({ onSuccess: () => refetchFlags() });

  if (authLoading || !ready || isLoading) return <SettingsLoading message="Loading admin dashboard..." />;
  if (isError || !data) {
    return <SettingsError message={settingsErrorMessage(error)} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-8">
      <div className="card flex flex-wrap items-center justify-between gap-4 border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Data import</p>
            <p className="text-sm text-muted-foreground">
              Upload client, project, and invoice CSV exports to migrate your data.
            </p>
          </div>
        </div>
        <Link href="/app/settings/import" className="btn-primary text-sm">Open import wizard</Link>
      </div>

      <KpiGrid items={[
        { label: 'Company', value: data.companyName },
        { label: 'Subscription', value: data.subscriptionPlan },
        { label: 'Active users', value: String(data.activeUsers) },
        { label: 'Integrations', value: String(data.activeIntegrations) },
        { label: 'System health', value: data.systemHealth },
        { label: 'SMS usage', value: String(data.smsUsageCount) },
        { label: 'Email usage', value: String(data.emailUsageCount) },
        { label: 'Storage (MB)', value: String(data.storageUsageMb) },
        { label: 'API calls', value: String(data.apiUsageCount) },
        { label: 'Last backup', value: data.lastBackupDate ? new Date(data.lastBackupDate).toLocaleDateString() : 'Never' },
      ]} />

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsSection title="Backup & recovery">
          <p className="text-sm text-muted-foreground">Create a manual backup of your organization configuration and data index.</p>
          <button type="button" className="btn-secondary mt-4" onClick={() => createBackup.mutate()} disabled={createBackup.isPending}>
            {createBackup.isPending ? 'Creating backup...' : 'Create manual backup'}
          </button>
        </SettingsSection>

        <SettingsSection title="Feature flags">
          <div className="space-y-2">
            {(flags ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Loading feature flags...</p>
            )}
            {(flags ?? []).map((f) => (
              <ToggleField
                key={f.id}
                label={f.label}
                checked={f.enabled}
                onChange={(v) => toggleFlag.mutate({ flagId: f.id, enabled: v })}
              />
            ))}
          </div>
        </SettingsSection>
      </div>

      {auditLogs && auditLogs.length > 0 && (
        <SettingsSection title="Recent audit activity">
          <ul className="space-y-2 text-sm">
            {auditLogs.map((log) => (
              <li key={log.id} className="flex justify-between border-b border-border pb-2">
                <span>{log.action} · {log.resource}</span>
                <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </SettingsSection>
      )}
    </div>
  );
}

export function CompanySettingsPage() {
  const { idToken, loading: authLoading } = useAuth();
  const ready = !authLoading && !!idToken;
  const { data, isLoading, isError, error, refetch } = trpc.settings360.company.useQuery(undefined, {
    enabled: ready,
    staleTime: 120_000,
  });
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateCompany.useMutation(saveHandlers);
  const [form, setForm] = useState({ companyName: '', dbaName: '', phone: '', email: '', website: '', addressLine1: '', city: '', state: '', postalCode: '', timeZone: 'America/New_York', taxId: '', maxTravelDistanceMiles: 50 });

  useEffect(() => {
    if (data) {
      setForm({
        companyName: data.companyName,
        dbaName: data.dbaName ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        addressLine1: data.addressLine1 ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
        postalCode: data.postalCode ?? '',
        timeZone: data.timeZone,
        taxId: data.taxId ?? '',
        maxTravelDistanceMiles: data.serviceArea?.maxTravelDistanceMiles ?? 50,
      });
    }
  }, [data]);

  if (authLoading || !ready || isLoading) return <SettingsLoading />;
  if (isError || !data) {
    return <SettingsError message={settingsErrorMessage(error) || 'Could not load company settings.'} onRetry={() => refetch()} />;
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate({ ...form, licenseNumbers: data.licenseNumbers, serviceArea: { ...data.serviceArea, maxTravelDistanceMiles: form.maxTravelDistanceMiles } }); }}>
      <SettingsSection title="Company profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Company name"><input className="input w-full" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></FormField>
          <FormField label="DBA name"><input className="input w-full" value={form.dbaName} onChange={(e) => setForm({ ...form, dbaName: e.target.value })} /></FormField>
          <FormField label="Phone"><input className="input w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormField>
          <FormField label="Email"><input className="input w-full" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></FormField>
          <FormField label="Website"><input className="input w-full" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></FormField>
          <FormField label="Time zone"><input className="input w-full" value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} /></FormField>
          <FormField label="Address"><input className="input w-full" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} /></FormField>
          <FormField label="City"><input className="input w-full" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></FormField>
          <FormField label="State"><input className="input w-full" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></FormField>
          <FormField label="ZIP"><input className="input w-full" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></FormField>
          <FormField label="Tax ID"><input className="input w-full" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></FormField>
        </div>
      </SettingsSection>
      <SettingsSection title="Service area" description="Configure travel distance and service boundaries.">
        <FormField label="Maximum travel distance (miles)">
          <input className="input w-full max-w-xs" type="number" min={0} value={form.maxTravelDistanceMiles} onChange={(e) => setForm({ ...form, maxTravelDistanceMiles: Number(e.target.value) })} />
        </FormField>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function BrandingSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.branding.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateBranding.useMutation(saveHandlers);
  const [form, setForm] = useState({
    primaryLogoUrl: '',
    invoiceLogoUrl: '',
    proposalLogoUrl: '',
    emailLogoUrl: '',
    primaryColor: '#DC2626',
    secondaryColor: '#1E40AF',
    accentColor: '#059669',
  });

  useEffect(() => {
    if (data) {
      setForm({
        primaryLogoUrl: data.primaryLogoUrl ?? '',
        invoiceLogoUrl: data.invoiceLogoUrl ?? '',
        proposalLogoUrl: data.proposalLogoUrl ?? '',
        emailLogoUrl: data.emailLogoUrl ?? '',
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
      });
    }
  }, [data]);

  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate(form); }}>
      <SettingsSection title="Brand management" description="Branding applies platform-wide to proposals, invoices, and emails.">
        <div className="grid gap-6 sm:grid-cols-2">
          <LogoUploadField label="Primary logo" value={form.primaryLogoUrl} onChange={(url) => setForm({ ...form, primaryLogoUrl: url })} />
          <LogoUploadField label="Proposal logo" value={form.proposalLogoUrl} onChange={(url) => setForm({ ...form, proposalLogoUrl: url })} />
          <LogoUploadField label="Invoice logo" value={form.invoiceLogoUrl} onChange={(url) => setForm({ ...form, invoiceLogoUrl: url })} />
          <LogoUploadField label="Email logo" value={form.emailLogoUrl} onChange={(url) => setForm({ ...form, emailLogoUrl: url })} />
          <FormField label="Primary color"><input type="color" className="h-10 w-20" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} /></FormField>
          <FormField label="Secondary color"><input type="color" className="h-10 w-20" value={form.secondaryColor} onChange={(e) => setForm({ ...form, secondaryColor: e.target.value })} /></FormField>
          <FormField label="Accent color"><input type="color" className="h-10 w-20" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} /></FormField>
        </div>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function NotificationSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.notifications.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateNotifications.useMutation(saveHandlers);
  const updateRule = trpc.settings360.updateNotificationRule.useMutation({ onSuccess: () => refetch() });
  const [form, setForm] = useState({ emailEnabled: true, smsEnabled: true, pushEnabled: true, inAppEnabled: true });

  useEffect(() => { if (data) setForm({ emailEnabled: data.emailEnabled, smsEnabled: data.smsEnabled, pushEnabled: data.pushEnabled, inAppEnabled: data.inAppEnabled }); }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  const channelOptions = ['email', 'sms', 'push', 'in_app'] as const;

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate(form); }}>
      <SettingsSection title="Global notifications">
        <div className="space-y-2">
          <ToggleField label="Email notifications" checked={form.emailEnabled} onChange={(v) => setForm({ ...form, emailEnabled: v })} />
          <ToggleField label="SMS notifications" checked={form.smsEnabled} onChange={(v) => setForm({ ...form, smsEnabled: v })} />
          <ToggleField label="Push notifications" checked={form.pushEnabled} onChange={(v) => setForm({ ...form, pushEnabled: v })} />
          <ToggleField label="In-app notifications" checked={form.inAppEnabled} onChange={(v) => setForm({ ...form, inAppEnabled: v })} />
        </div>
      </SettingsSection>
      <SettingsSection title="Notification rules" description="Configure which events trigger notifications and through which channels.">
        <div className="space-y-3">
          {data.rules.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Event: {r.event}</p>
                </div>
                <ToggleField label="Active" checked={r.enabled} onChange={(v) => updateRule.mutate({ ruleId: r.id, enabled: v })} />
              </div>
              <MultiSelectDropdown
                label="Channels"
                placeholder="Select channels"
                options={channelOptions.map((channel) => ({
                  value: channel,
                  label: channel.replace('_', ' '),
                }))}
                values={r.channels}
                onChange={(channels) => {
                  if (channels.length === 0) return;
                  updateRule.mutate({ ruleId: r.id, channels });
                }}
                className="mt-3"
              />
            </div>
          ))}
        </div>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function AutomationSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.automation.useQuery();
  const updateRule = trpc.settings360.updateAutomationRule.useMutation({ onSuccess: () => refetch() });
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <SettingsSection title="Workflow automation" description="Manage proposal follow-ups, invoice reminders, crew notifications, and renewal campaigns.">
      <div className="space-y-3">
        {data.rules.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div>
              <p className="font-medium">{rule.name}</p>
              <p className="text-xs text-muted-foreground">{rule.triggerEvent} · {rule.delayHours}h delay · {rule.deliveryMethod}</p>
            </div>
            <ToggleField label="Enabled" checked={rule.enabled} onChange={(v) => updateRule.mutate({ ruleId: rule.id, enabled: v })} />
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}

export function ProposalSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.proposals.useQuery();
  const { data: company } = trpc.settings360.company.useQuery();
  const { data: branding } = trpc.settings360.branding.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateProposals.useMutation(saveHandlers);
  const [form, setForm] = useState({
    numberFormat: '',
    defaultExpirationDays: 30,
    defaultDepositPercent: 50,
    defaultTerms: '',
    defaultTemplateId: '',
    packageDefaults: {
      good: { label: 'Good', markupPercent: 15 },
      better: { label: 'Better', markupPercent: 25 },
      best: { label: 'Best', markupPercent: 35 },
    },
    layout: {
      style: 'modern' as 'classic' | 'modern' | 'compact',
      headerTitle: 'Proposal',
      footerText: '',
      showLogo: true,
      showCompanyInfo: true,
      showPackageComparison: true,
      showLineItemPhotos: true,
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        numberFormat: data.numberFormat,
        defaultExpirationDays: data.defaultExpirationDays,
        defaultDepositPercent: data.defaultDepositPercent,
        defaultTerms: data.defaultTerms,
        defaultTemplateId: data.defaultTemplateId ?? '',
        packageDefaults: data.packageDefaults,
        layout: data.layout,
      });
    }
  }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      update.mutate({ ...form, defaultTemplateId: form.defaultTemplateId || null });
    }}>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
      <SettingsSection title="Default proposal rules">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Number format"><input className="input w-full" value={form.numberFormat} onChange={(e) => setForm({ ...form, numberFormat: e.target.value })} /></FormField>
          <FormField label="Default expiration (days)"><input className="input w-full" type="number" value={form.defaultExpirationDays} onChange={(e) => setForm({ ...form, defaultExpirationDays: Number(e.target.value) })} /></FormField>
          <FormField label="Default deposit %"><input className="input w-full" type="number" value={form.defaultDepositPercent} onChange={(e) => setForm({ ...form, defaultDepositPercent: Number(e.target.value) })} /></FormField>
          <FormField label="Default template ID"><input className="input w-full" value={form.defaultTemplateId} onChange={(e) => setForm({ ...form, defaultTemplateId: e.target.value })} placeholder="Optional template reference" /></FormField>
        </div>
        <FormField label="Default terms"><textarea className="input mt-4 w-full" rows={4} value={form.defaultTerms} onChange={(e) => setForm({ ...form, defaultTerms: e.target.value })} /></FormField>
      </SettingsSection>
      <SettingsSection title="Package defaults">
        <div className="grid gap-4 sm:grid-cols-3">
          {(['good', 'better', 'best'] as const).map((tier) => (
            <div key={tier} className="rounded-lg border p-4 space-y-2">
              <p className="font-medium capitalize">{tier}</p>
              <FormField label="Label">
                <input className="input w-full text-sm" value={form.packageDefaults[tier].label} onChange={(e) => setForm({ ...form, packageDefaults: { ...form.packageDefaults, [tier]: { ...form.packageDefaults[tier], label: e.target.value } } })} />
              </FormField>
              <FormField label="Markup %">
                <input className="input w-full text-sm" type="number" value={form.packageDefaults[tier].markupPercent} onChange={(e) => setForm({ ...form, packageDefaults: { ...form.packageDefaults, [tier]: { ...form.packageDefaults[tier], markupPercent: Number(e.target.value) } } })} />
              </FormField>
            </div>
          ))}
        </div>
      </SettingsSection>
      <SettingsSection title="Proposal layout">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Layout style">
            <select className="input w-full" value={form.layout.style} onChange={(e) => setForm({ ...form, layout: { ...form.layout, style: e.target.value as typeof form.layout.style } })}>
              <option value="classic">Classic</option>
              <option value="modern">Modern</option>
              <option value="compact">Compact</option>
            </select>
          </FormField>
          <FormField label="Header title"><input className="input w-full" value={form.layout.headerTitle} onChange={(e) => setForm({ ...form, layout: { ...form.layout, headerTitle: e.target.value } })} /></FormField>
        </div>
        <FormField label="Footer text"><textarea className="input mt-4 w-full" rows={2} value={form.layout.footerText} onChange={(e) => setForm({ ...form, layout: { ...form.layout, footerText: e.target.value } })} /></FormField>
        <div className="mt-4 space-y-2">
          <ToggleField label="Show logo" checked={form.layout.showLogo} onChange={(v) => setForm({ ...form, layout: { ...form.layout, showLogo: v } })} />
          <ToggleField label="Show company info" checked={form.layout.showCompanyInfo} onChange={(v) => setForm({ ...form, layout: { ...form.layout, showCompanyInfo: v } })} />
          <ToggleField label="Show package comparison" checked={form.layout.showPackageComparison} onChange={(v) => setForm({ ...form, layout: { ...form.layout, showPackageComparison: v } })} />
          <ToggleField label="Show line item photos" checked={form.layout.showLineItemPhotos} onChange={(v) => setForm({ ...form, layout: { ...form.layout, showLineItemPhotos: v } })} />
        </div>
      </SettingsSection>
        </div>
        <SettingsSection title="Live preview" description="Updates as you change layout options.">
          <ProposalLayoutPreview
            companyName={company?.companyName ?? 'Yuletide Lighting'}
            branding={branding}
            layout={form.layout}
          />
        </SettingsSection>
      </div>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function InvoiceSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.invoices.useQuery();
  const { data: company } = trpc.settings360.company.useQuery();
  const { data: branding } = trpc.settings360.branding.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateInvoices.useMutation(saveHandlers);
  const [form, setForm] = useState({
    numberFormat: '',
    paymentTermsDays: 30,
    lateFeePercent: 1.5,
    taxRatePercent: 0,
    depositRequiredPercent: 50,
    reminderDays: '3, 7, 14, 30',
    layout: {
      style: 'classic' as 'classic' | 'modern' | 'compact',
      headerTitle: 'Invoice',
      footerText: '',
      showLogo: true,
      showCompanyInfo: true,
      showTaxBreakdown: true,
      paymentInstructions: '',
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        numberFormat: data.numberFormat,
        paymentTermsDays: data.paymentTermsDays,
        lateFeePercent: data.lateFeePercent,
        taxRatePercent: data.taxRatePercent,
        depositRequiredPercent: data.depositRequiredPercent,
        reminderDays: data.reminderDays.join(', '),
        layout: data.layout,
      });
    }
  }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      const reminderDays = form.reminderDays.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n) && n >= 0);
      update.mutate({
        numberFormat: form.numberFormat,
        paymentTermsDays: form.paymentTermsDays,
        lateFeePercent: form.lateFeePercent,
        taxRatePercent: form.taxRatePercent,
        depositRequiredPercent: form.depositRequiredPercent,
        reminderDays: reminderDays.length ? reminderDays : [3, 7, 14, 30],
        layout: form.layout,
      });
    }}>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-6">
      <SettingsSection title="Invoice defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Number format"><input className="input w-full" value={form.numberFormat} onChange={(e) => setForm({ ...form, numberFormat: e.target.value })} /></FormField>
          <FormField label="Payment terms (days)"><input className="input w-full" type="number" value={form.paymentTermsDays} onChange={(e) => setForm({ ...form, paymentTermsDays: Number(e.target.value) })} /></FormField>
          <FormField label="Late fee %"><input className="input w-full" type="number" step="0.1" value={form.lateFeePercent} onChange={(e) => setForm({ ...form, lateFeePercent: Number(e.target.value) })} /></FormField>
          <FormField label="Tax rate %"><input className="input w-full" type="number" step="0.1" value={form.taxRatePercent} onChange={(e) => setForm({ ...form, taxRatePercent: Number(e.target.value) })} /></FormField>
          <FormField label="Deposit required %"><input className="input w-full" type="number" value={form.depositRequiredPercent} onChange={(e) => setForm({ ...form, depositRequiredPercent: Number(e.target.value) })} /></FormField>
        </div>
      </SettingsSection>
      <SettingsSection title="Automatic reminders">
        <FormField label="Reminder days (comma-separated)">
          <input className="input w-full max-w-md" value={form.reminderDays} onChange={(e) => setForm({ ...form, reminderDays: e.target.value })} placeholder="3, 7, 14, 30" />
        </FormField>
      </SettingsSection>
      <SettingsSection title="Invoice layout">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Layout style">
            <select className="input w-full" value={form.layout.style} onChange={(e) => setForm({ ...form, layout: { ...form.layout, style: e.target.value as typeof form.layout.style } })}>
              <option value="classic">Classic</option>
              <option value="modern">Modern</option>
              <option value="compact">Compact</option>
            </select>
          </FormField>
          <FormField label="Header title"><input className="input w-full" value={form.layout.headerTitle} onChange={(e) => setForm({ ...form, layout: { ...form.layout, headerTitle: e.target.value } })} /></FormField>
        </div>
        <FormField label="Footer text"><textarea className="input mt-4 w-full" rows={2} value={form.layout.footerText} onChange={(e) => setForm({ ...form, layout: { ...form.layout, footerText: e.target.value } })} /></FormField>
        <FormField label="Payment instructions"><textarea className="input mt-4 w-full" rows={3} value={form.layout.paymentInstructions} onChange={(e) => setForm({ ...form, layout: { ...form.layout, paymentInstructions: e.target.value } })} /></FormField>
        <div className="mt-4 space-y-2">
          <ToggleField label="Show logo" checked={form.layout.showLogo} onChange={(v) => setForm({ ...form, layout: { ...form.layout, showLogo: v } })} />
          <ToggleField label="Show company info" checked={form.layout.showCompanyInfo} onChange={(v) => setForm({ ...form, layout: { ...form.layout, showCompanyInfo: v } })} />
          <ToggleField label="Show tax breakdown" checked={form.layout.showTaxBreakdown} onChange={(v) => setForm({ ...form, layout: { ...form.layout, showTaxBreakdown: v } })} />
        </div>
      </SettingsSection>
        </div>
        <SettingsSection title="Live preview" description="Updates as you change layout options.">
          <InvoiceLayoutPreview
            companyName={company?.companyName ?? 'Yuletide Lighting'}
            branding={branding}
            layout={form.layout}
          />
        </SettingsSection>
      </div>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function JobSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.jobs.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateJobs.useMutation(saveHandlers);
  const [form, setForm] = useState({ numberFormat: '', crewCapacityPerDay: 4, defaultScheduleDurationHours: 4, dispatchAutoAssign: false });

  useEffect(() => { if (data) setForm({ numberFormat: data.numberFormat, crewCapacityPerDay: data.crewCapacityPerDay, defaultScheduleDurationHours: data.defaultScheduleDurationHours, dispatchAutoAssign: data.dispatchAutoAssign }); }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate({ ...form, statusFlow: data.statusFlow }); }}>
      <SettingsSection title="Job & scheduling defaults">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Job number format"><input className="input w-full" value={form.numberFormat} onChange={(e) => setForm({ ...form, numberFormat: e.target.value })} /></FormField>
          <FormField label="Crew capacity per day"><input className="input w-full" type="number" value={form.crewCapacityPerDay} onChange={(e) => setForm({ ...form, crewCapacityPerDay: Number(e.target.value) })} /></FormField>
          <FormField label="Default schedule duration (hours)"><input className="input w-full" type="number" value={form.defaultScheduleDurationHours} onChange={(e) => setForm({ ...form, defaultScheduleDurationHours: Number(e.target.value) })} /></FormField>
        </div>
        <div className="mt-4"><ToggleField label="Auto-assign dispatch" checked={form.dispatchAutoAssign} onChange={(v) => setForm({ ...form, dispatchAutoAssign: v })} /></div>
      </SettingsSection>
      <SettingsSection title="Status flow">
        <p className="text-sm">{data.statusFlow.join(' → ')}</p>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function InventorySettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.inventory.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateInventory.useMutation(saveHandlers);
  const [form, setForm] = useState({ skuFormat: '', defaultReorderThreshold: 10, auditFrequencyDays: 90 });

  useEffect(() => { if (data) setForm({ skuFormat: data.skuFormat, defaultReorderThreshold: data.defaultReorderThreshold, auditFrequencyDays: data.auditFrequencyDays }); }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate({ ...form, categories: data.categories }); }}>
      <SettingsSection title="Inventory rules">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="SKU format"><input className="input w-full" value={form.skuFormat} onChange={(e) => setForm({ ...form, skuFormat: e.target.value })} /></FormField>
          <FormField label="Default reorder threshold"><input className="input w-full" type="number" value={form.defaultReorderThreshold} onChange={(e) => setForm({ ...form, defaultReorderThreshold: Number(e.target.value) })} /></FormField>
          <FormField label="Audit frequency (days)"><input className="input w-full" type="number" value={form.auditFrequencyDays} onChange={(e) => setForm({ ...form, auditFrequencyDays: Number(e.target.value) })} /></FormField>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Categories: {data.categories.join(', ')}</p>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function CustomerPortalSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.portal.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updatePortal.useMutation(saveHandlers);
  const [form, setForm] = useState({ enabled: true, allowSelfScheduling: false, allowOnlinePayments: true, allowServiceRequests: true, viewProposals: true, viewInvoices: true, approveDesigns: true, requestService: true });

  useEffect(() => {
    if (data) setForm({
      enabled: data.enabled, allowSelfScheduling: data.allowSelfScheduling, allowOnlinePayments: data.allowOnlinePayments, allowServiceRequests: data.allowServiceRequests,
      viewProposals: data.permissions.viewProposals, viewInvoices: data.permissions.viewInvoices, approveDesigns: data.permissions.approveDesigns, requestService: data.permissions.requestService,
    });
  }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      update.mutate({
        enabled: form.enabled, allowSelfScheduling: form.allowSelfScheduling, allowOnlinePayments: form.allowOnlinePayments, allowServiceRequests: form.allowServiceRequests,
        permissions: { viewProposals: form.viewProposals, viewInvoices: form.viewInvoices, approveDesigns: form.approveDesigns, requestService: form.requestService },
      });
    }}>
      <SettingsSection title="Portal access">
        <div className="space-y-2">
          <ToggleField label="Portal enabled" checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} />
          <ToggleField label="Self scheduling" checked={form.allowSelfScheduling} onChange={(v) => setForm({ ...form, allowSelfScheduling: v })} />
          <ToggleField label="Online payments" checked={form.allowOnlinePayments} onChange={(v) => setForm({ ...form, allowOnlinePayments: v })} />
          <ToggleField label="Service requests" checked={form.allowServiceRequests} onChange={(v) => setForm({ ...form, allowServiceRequests: v })} />
        </div>
      </SettingsSection>
      <SettingsSection title="Customer permissions">
        <div className="space-y-2">
          <ToggleField label="View proposals" checked={form.viewProposals} onChange={(v) => setForm({ ...form, viewProposals: v })} />
          <ToggleField label="View invoices" checked={form.viewInvoices} onChange={(v) => setForm({ ...form, viewInvoices: v })} />
          <ToggleField label="Approve designs" checked={form.approveDesigns} onChange={(v) => setForm({ ...form, approveDesigns: v })} />
          <ToggleField label="Request service" checked={form.requestService} onChange={(v) => setForm({ ...form, requestService: v })} />
        </div>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function AiSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.ai.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateAi.useMutation(saveHandlers);
  const [form, setForm] = useState({ proposalWriterEnabled: true, followUpAssistantEnabled: true, forecastingEnabled: true, dispatchAssistantEnabled: true, monthlyUsageLimit: 1000 });

  useEffect(() => { if (data) setForm({ proposalWriterEnabled: data.proposalWriterEnabled, followUpAssistantEnabled: data.followUpAssistantEnabled, forecastingEnabled: data.forecastingEnabled, dispatchAssistantEnabled: data.dispatchAssistantEnabled, monthlyUsageLimit: data.monthlyUsageLimit }); }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate({ ...form, allowedFeatures: data.allowedFeatures }); }}>
      <SettingsSection title="AI features" description={`Current usage: ${data.currentUsageCount} / ${data.monthlyUsageLimit} this month`}>
        <div className="space-y-2">
          <ToggleField label="AI proposal writer" checked={form.proposalWriterEnabled} onChange={(v) => setForm({ ...form, proposalWriterEnabled: v })} />
          <ToggleField label="AI follow-up assistant" checked={form.followUpAssistantEnabled} onChange={(v) => setForm({ ...form, followUpAssistantEnabled: v })} />
          <ToggleField label="AI forecasting" checked={form.forecastingEnabled} onChange={(v) => setForm({ ...form, forecastingEnabled: v })} />
          <ToggleField label="AI dispatch assistant" checked={form.dispatchAssistantEnabled} onChange={(v) => setForm({ ...form, dispatchAssistantEnabled: v })} />
        </div>
        <FormField label="Monthly usage limit"><input className="input mt-4 max-w-xs" type="number" value={form.monthlyUsageLimit} onChange={(e) => setForm({ ...form, monthlyUsageLimit: Number(e.target.value) })} /></FormField>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

export function SecuritySettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.security.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateSecurity.useMutation(saveHandlers);
  const { data: auditLogs } = trpc.settings360.auditLogs.useQuery({ limit: 20 });
  const [form, setForm] = useState({ emailLoginEnabled: true, googleLoginEnabled: true, microsoftLoginEnabled: false, twoFactorRequired: false, passwordExpirationDays: 90, sessionTimeoutMinutes: 480 });

  useEffect(() => { if (data) setForm({ emailLoginEnabled: data.emailLoginEnabled, googleLoginEnabled: data.googleLoginEnabled, microsoftLoginEnabled: data.microsoftLoginEnabled, twoFactorRequired: data.twoFactorRequired, passwordExpirationDays: data.passwordExpirationDays, sessionTimeoutMinutes: data.sessionTimeoutMinutes }); }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate(form); }}>
        <SettingsSection title="Authentication">
          <div className="space-y-2">
            <ToggleField label="Email login" checked={form.emailLoginEnabled} onChange={(v) => setForm({ ...form, emailLoginEnabled: v })} />
            <ToggleField label="Google login" checked={form.googleLoginEnabled} onChange={(v) => setForm({ ...form, googleLoginEnabled: v })} />
            <ToggleField label="Microsoft login" checked={form.microsoftLoginEnabled} onChange={(v) => setForm({ ...form, microsoftLoginEnabled: v })} />
            <ToggleField label="Require two-factor authentication" checked={form.twoFactorRequired} onChange={(v) => setForm({ ...form, twoFactorRequired: v })} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Password expiration (days)"><input className="input w-full" type="number" value={form.passwordExpirationDays} onChange={(e) => setForm({ ...form, passwordExpirationDays: Number(e.target.value) })} /></FormField>
            <FormField label="Session timeout (minutes)"><input className="input w-full" type="number" value={form.sessionTimeoutMinutes} onChange={(e) => setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })} /></FormField>
          </div>
        </SettingsSection>
        <SaveButton saving={update.isPending} />
      </form>
      {auditLogs && (
        <SettingsSection title="Audit logs">
          <table className="data-table w-full text-sm">
            <thead><tr><th>Action</th><th>Resource</th><th>User</th><th>Date</th></tr></thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}><td>{log.action}</td><td>{log.resource}</td><td>{log.userEmail ?? '—'}</td><td>{new Date(log.createdAt).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </SettingsSection>
      )}
    </div>
  );
}

export function SystemPreferencesPage() {
  const { data, isLoading, refetch } = trpc.settings360.system.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateSystem.useMutation(saveHandlers);
  const { data: flags, refetch: refetchFlags } = trpc.settings360.featureFlags.useQuery();
  const toggleFlag = trpc.settings360.toggleFeatureFlag.useMutation({ onSuccess: () => refetchFlags() });
  const [form, setForm] = useState({ timeZone: 'America/New_York', dateFormat: 'MM/DD/YYYY', currency: 'USD' as 'USD' | 'CAD', measurementUnit: 'feet' as 'feet' | 'meters' });

  useEffect(() => { if (data) setForm({ timeZone: data.timeZone, dateFormat: data.dateFormat, currency: data.currency, measurementUnit: data.measurementUnit }); }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate(form); }}>
        <SettingsSection title="System preferences">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Time zone"><input className="input w-full" value={form.timeZone} onChange={(e) => setForm({ ...form, timeZone: e.target.value })} /></FormField>
            <FormField label="Date format"><input className="input w-full" value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} /></FormField>
            <FormField label="Currency">
              <select className="input w-full" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as 'USD' | 'CAD' })}>
                <option value="USD">USD</option><option value="CAD">CAD</option>
              </select>
            </FormField>
            <FormField label="Measurement units">
              <select className="input w-full" value={form.measurementUnit} onChange={(e) => setForm({ ...form, measurementUnit: e.target.value as 'feet' | 'meters' })}>
                <option value="feet">Feet</option><option value="meters">Meters</option>
              </select>
            </FormField>
          </div>
        </SettingsSection>
        <SaveButton saving={update.isPending} />
      </form>
      {flags && flags.length > 0 ? (
        <SettingsSection title="Feature flags">
          <div className="space-y-2">
            {flags.map((f) => (
              <ToggleField key={f.id} label={`${f.label}${f.description ? ` — ${f.description}` : ''}`} checked={f.enabled} onChange={(v) => toggleFlag.mutate({ flagId: f.id, enabled: v })} />
            ))}
          </div>
        </SettingsSection>
      ) : (
        <SettingsSection title="Feature flags">
          <p className="text-sm text-muted-foreground">No feature flags found. Visit this page again to auto-seed defaults.</p>
        </SettingsSection>
      )}
    </div>
  );
}

export function ReportsSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.reports.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateReports.useMutation(saveHandlers);
  const [autoRefresh, setAutoRefresh] = useState(30);

  useEffect(() => { if (data) setAutoRefresh(data.autoRefreshSeconds); }, [data]);
  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); update.mutate({ autoRefreshSeconds: autoRefresh }); }}>
      <SettingsSection title="Reports configuration">
        <FormField label="Dashboard auto-refresh (seconds)">
          <input className="input max-w-xs" type="number" min={10} max={300} value={autoRefresh} onChange={(e) => setAutoRefresh(Number(e.target.value))} />
        </FormField>
        <p className="mt-2 text-sm text-muted-foreground">Default dashboard role: {roleLabel(data.defaultDashboardRole)}</p>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}

const TEMPLATE_LINKS = [
  { href: '/app/settings/proposals', title: 'Proposal terms & layout', description: 'Default terms, deposit %, expiration, and PDF layout.' },
  { href: '/app/settings/invoices', title: 'Invoice layout', description: 'Payment terms, tax rate, deposit rules, and invoice PDF layout.' },
  { href: '/app/settings/branding', title: 'Branding & logos', description: 'Company colors and logos used on proposals, invoices, and portal.' },
  { href: '/app/messages/templates', title: 'Email & SMS templates', description: 'Customer messaging templates for campaigns and automations.' },
] as const;

export function TemplatesSettingsPage() {
  const { data: proposals, isLoading: proposalsLoading } = trpc.settings360.proposals.useQuery();
  const { data: invoices, isLoading: invoicesLoading } = trpc.settings360.invoices.useQuery();
  const { data: branding, isLoading: brandingLoading } = trpc.settings360.branding.useQuery();

  if (proposalsLoading || invoicesLoading || brandingLoading) return <SettingsLoading />;

  return (
    <div className="space-y-6">
      <SettingsSection title="Template hub" description="Central place for document defaults, branding, and customer messaging templates.">
        <div className="grid gap-4 md:grid-cols-2">
          {TEMPLATE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-lg border border-border p-4 transition hover:border-primary/40 hover:bg-muted/30">
              <p className="font-medium">{link.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </SettingsSection>
      <SettingsSection title="Current defaults">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Proposals</p>
            <p className="mt-2 text-sm">Deposit: {proposals?.defaultDepositPercent ?? 50}%</p>
            <p className="text-sm">Expires in {proposals?.defaultExpirationDays ?? 30} days</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Invoices</p>
            <p className="mt-2 text-sm">Payment terms: {invoices?.paymentTermsDays ?? 30} days</p>
            <p className="text-sm">Deposit required: {invoices?.depositRequiredPercent ?? 50}%</p>
            <p className="text-sm">Tax rate: {invoices?.taxRatePercent ?? 0}%</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Branding</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-full border" style={{ backgroundColor: branding?.primaryColor ?? '#DC2626' }} />
              <p className="text-sm">{branding?.primaryColor ?? '#DC2626'}</p>
            </div>
            <p className="text-sm text-muted-foreground">{branding?.primaryLogoUrl ? 'Logo configured' : 'No logo uploaded'}</p>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

const MONTH_OPTIONS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

function MonthSelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <FormField label={label}>
      <select className="input w-full" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {MONTH_OPTIONS.map((name, index) => (
          <option key={name} value={index}>{name}</option>
        ))}
      </select>
    </FormField>
  );
}

export function SeasonSettingsPage() {
  const { data, isLoading, refetch } = trpc.settings360.season.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateSeason.useMutation(saveHandlers);
  const [form, setForm] = useState({
    seasonYear: new Date().getFullYear(),
    salesStartMonth: 6,
    installStartMonth: 9,
    installEndMonth: 11,
    removalStartMonth: 0,
    removalEndMonth: 1,
    rebookingStartMonth: 7,
    defaultInstallLeadDays: 14,
    defaultRemovalLeadDays: 7,
    blackoutWeeks: '',
  });

  useEffect(() => {
    if (data) {
      setForm({
        seasonYear: data.seasonYear,
        salesStartMonth: data.salesStartMonth,
        installStartMonth: data.installStartMonth,
        installEndMonth: data.installEndMonth,
        removalStartMonth: data.removalStartMonth,
        removalEndMonth: data.removalEndMonth,
        rebookingStartMonth: data.rebookingStartMonth,
        defaultInstallLeadDays: data.defaultInstallLeadDays,
        defaultRemovalLeadDays: data.defaultRemovalLeadDays,
        blackoutWeeks: (data.blackoutWeeks ?? []).join(', '),
      });
    }
  }, [data]);

  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      const blackoutWeeks = form.blackoutWeeks
        .split(',')
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v >= 1 && v <= 53);
      update.mutate({
        seasonYear: form.seasonYear,
        salesStartMonth: form.salesStartMonth,
        installStartMonth: form.installStartMonth,
        installEndMonth: form.installEndMonth,
        removalStartMonth: form.removalStartMonth,
        removalEndMonth: form.removalEndMonth,
        rebookingStartMonth: form.rebookingStartMonth,
        defaultInstallLeadDays: form.defaultInstallLeadDays,
        defaultRemovalLeadDays: form.defaultRemovalLeadDays,
        blackoutWeeks,
      });
    }}>
      <SettingsSection title="Season calendar" description="Defaults used when creating proposals and planning install/removal windows.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label="Season year">
            <input className="input w-full" type="number" min={2020} max={2100} value={form.seasonYear} onChange={(e) => setForm({ ...form, seasonYear: Number(e.target.value) })} />
          </FormField>
          <MonthSelect label="Sales season starts" value={form.salesStartMonth} onChange={(v) => setForm({ ...form, salesStartMonth: v })} />
          <MonthSelect label="Rebooking outreach starts" value={form.rebookingStartMonth} onChange={(v) => setForm({ ...form, rebookingStartMonth: v })} />
          <MonthSelect label="Install season starts" value={form.installStartMonth} onChange={(v) => setForm({ ...form, installStartMonth: v })} />
          <MonthSelect label="Install season ends" value={form.installEndMonth} onChange={(v) => setForm({ ...form, installEndMonth: v })} />
          <MonthSelect label="Removal season starts" value={form.removalStartMonth} onChange={(v) => setForm({ ...form, removalStartMonth: v })} />
          <MonthSelect label="Removal season ends" value={form.removalEndMonth} onChange={(v) => setForm({ ...form, removalEndMonth: v })} />
          <FormField label="Default install lead time (days)">
            <input className="input w-full" type="number" min={0} max={120} value={form.defaultInstallLeadDays} onChange={(e) => setForm({ ...form, defaultInstallLeadDays: Number(e.target.value) })} />
          </FormField>
          <FormField label="Default removal lead time (days)">
            <input className="input w-full" type="number" min={0} max={120} value={form.defaultRemovalLeadDays} onChange={(e) => setForm({ ...form, defaultRemovalLeadDays: Number(e.target.value) })} />
          </FormField>
        </div>
        <FormField label="Blackout weeks (comma-separated ISO week numbers)">
          <input className="input mt-4 w-full" value={form.blackoutWeeks} onChange={(e) => setForm({ ...form, blackoutWeeks: e.target.value })} placeholder="e.g. 47, 48, 51" />
        </FormField>
      </SettingsSection>
      <SaveButton saving={update.isPending} />
    </form>
  );
}
