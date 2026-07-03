'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { roleLabel, SETTINGS_ROLES, USER_STATUSES } from '@/lib/settings-utils';
import { FormField, SaveButton, SettingsError, SettingsLoading, SettingsSection, ToggleField, useSettingsSave } from './settings-widgets';
import type { PermissionAction, PermissionResource, PermissionMatrix } from '@clcrm/types';

const RESOURCES: PermissionResource[] = ['customers', 'mockups', 'proposals', 'jobs', 'invoices', 'inventory', 'reports', 'settings'];
const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'export', 'approve'];

type UserDraft = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  role: (typeof SETTINGS_ROLES)[number];
  status: (typeof USER_STATUSES)[number];
};

export function UserManagerPage() {
  const { data, isLoading, isError, refetch } = trpc.settings360.users.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const updateUser = trpc.settings360.updateUser.useMutation(saveHandlers);
  const inviteUser = trpc.settings360.inviteUser.useMutation({
    onSuccess: () => {
      refetch();
      setInvite({ email: '', firstName: '', lastName: '', role: 'office_staff', department: '' });
      saveHandlers.onSuccess();
    },
    onError: saveHandlers.onError,
  });
  const [drafts, setDrafts] = useState<Record<string, UserDraft>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invite, setInvite] = useState({ email: '', firstName: '', lastName: '', role: 'office_staff' as (typeof SETTINGS_ROLES)[number], department: '' });

  useEffect(() => {
    if (!data) return;
    const next: Record<string, UserDraft> = {};
    for (const user of data) {
      next[user.id] = {
        email: user.email ?? '',
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        phone: user.phone ?? '',
        department: user.department ?? '',
        role: user.role,
        status: user.status,
      };
    }
    setDrafts(next);
  }, [data]);

  function saveUser(userId: string) {
    const draft = drafts[userId];
    if (!draft) return;
    if (!draft.email.trim()) {
      saveHandlers.onError({ message: 'Email is required' });
      return;
    }
    updateUser.mutate({
      userId,
      email: draft.email.trim(),
      firstName: draft.firstName || null,
      lastName: draft.lastName || null,
      phone: draft.phone || null,
      department: draft.department || null,
      role: draft.role,
      status: draft.status,
    }, { onSuccess: () => setEditingId(null) });
  }

  if (isLoading) return <SettingsLoading message="Loading users..." />;
  if (isError || !data) return <SettingsError message="Could not load users." onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <SettingsSection title="Add team member" description="Invite someone by email. They appear as pending until they sign up.">
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            inviteUser.mutate({
              email: invite.email,
              firstName: invite.firstName || null,
              lastName: invite.lastName || null,
              department: invite.department || null,
              role: invite.role,
            });
          }}
        >
          <FormField label="Email *">
            <input className="input w-full" type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          </FormField>
          <FormField label="First name">
            <input className="input w-full" value={invite.firstName} onChange={(e) => setInvite({ ...invite, firstName: e.target.value })} />
          </FormField>
          <FormField label="Last name">
            <input className="input w-full" value={invite.lastName} onChange={(e) => setInvite({ ...invite, lastName: e.target.value })} />
          </FormField>
          <FormField label="Role">
            <select className="input w-full" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as typeof invite.role })}>
              {SETTINGS_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </FormField>
          <FormField label="Department">
            <input className="input w-full" value={invite.department} onChange={(e) => setInvite({ ...invite, department: e.target.value })} />
          </FormField>
          <div className="flex items-end">
            <SaveButton saving={inviteUser.isPending} label="Add member" />
          </div>
        </form>
      </SettingsSection>

      <SettingsSection title="User management" description={`${data.length} team members`}>
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Department</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((user) => {
                const draft = drafts[user.id];
                const editing = editingId === user.id;
                if (!draft) return null;
                return (
                  <tr key={user.id}>
                    <td>
                      {editing ? (
                        <div className="flex gap-1">
                          <input className="input text-sm w-24" placeholder="First" value={draft.firstName} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, firstName: e.target.value } })} />
                          <input className="input text-sm w-24" placeholder="Last" value={draft.lastName} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, lastName: e.target.value } })} />
                        </div>
                      ) : (
                        `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—'
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <input className="input text-sm min-w-[180px]" type="email" required value={draft.email} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, email: e.target.value } })} />
                      ) : (
                        user.email || '—'
                      )}
                    </td>
                    <td>
                      {editing ? (
                        <input className="input text-sm w-28" value={draft.phone} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, phone: e.target.value } })} />
                      ) : (
                        user.phone ?? '—'
                      )}
                    </td>
                    <td>
                      <select
                        className="input text-sm"
                        value={draft.role}
                        disabled={!editing}
                        onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, role: e.target.value as UserDraft['role'] } })}
                      >
                        {SETTINGS_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                      </select>
                    </td>
                    <td>
                      <select
                        className="input text-sm"
                        value={draft.status}
                        disabled={!editing || user.id.startsWith('invite:')}
                        onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, status: e.target.value as UserDraft['status'] } })}
                      >
                        {USER_STATUSES.map((s) => <option key={s} value={s}>{roleLabel(s)}</option>)}
                      </select>
                    </td>
                    <td>
                      {editing ? (
                        <input className="input text-sm w-28" value={draft.department} onChange={(e) => setDrafts({ ...drafts, [user.id]: { ...draft, department: e.target.value } })} />
                      ) : (
                        user.department ?? '—'
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {editing ? (
                        <div className="flex gap-2">
                          <button type="button" className="btn-primary text-xs" disabled={updateUser.isPending} onClick={() => saveUser(user.id)}>Save</button>
                          <button type="button" className="btn-secondary text-xs" onClick={() => {
                            setEditingId(null);
                            setDrafts((prev) => ({
                              ...prev,
                              [user.id]: {
                                email: user.email ?? '',
                                firstName: user.firstName ?? '',
                                lastName: user.lastName ?? '',
                                phone: user.phone ?? '',
                                department: user.department ?? '',
                                role: user.role,
                                status: user.status,
                              },
                            }));
                          }}>Cancel</button>
                        </div>
                      ) : (
                        <button type="button" className="btn-secondary text-xs" onClick={() => setEditingId(user.id)}>Edit</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SettingsSection>
    </div>
  );
}

export function RolePermissionMatrixPage() {
  const { data, isLoading, isError, error, refetch } = trpc.settings360.roles.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateRolePermissions.useMutation(saveHandlers);

  const selected = data?.find((r) => r.id === selectedId) ?? data?.[0] ?? null;
  const [matrix, setMatrix] = useState<PermissionMatrix | undefined>(selected?.permissions);

  useEffect(() => {
    if (selected) setMatrix(selected.permissions);
  }, [selected?.id]);

  if (isLoading) return <SettingsLoading message="Loading roles..." />;
  if (isError || !data?.length) {
    return <SettingsError message={error?.message ?? 'Could not load roles.'} onRetry={() => refetch()} />;
  }

  function togglePerm(resource: PermissionResource, action: PermissionAction) {
    if (!matrix || !selected) return;
    const next = { ...matrix, [resource]: { ...matrix[resource], [action]: !matrix[resource][action] } };
    setMatrix(next);
    update.mutate({ roleId: selected.id, permissions: next });
  }

  return (
    <div className="space-y-6">
      <SettingsSection title="Role-based access control" description={`${data.length} roles configured`}>
        <div className="flex flex-wrap gap-2">
          {data.map((role) => (
            <button
              key={role.id}
              type="button"
              className={selected?.id === role.id ? 'rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground' : 'rounded-lg border px-3 py-1.5 text-sm'}
              onClick={() => { setSelectedId(role.id); setMatrix(role.permissions); }}
            >
              {role.name}
            </button>
          ))}
        </div>
      </SettingsSection>

      {selected && matrix && (
        <SettingsSection title={`Permissions: ${selected.name}`} description={selected.description ?? undefined}>
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr><th>Resource</th>{ACTIONS.map((a) => <th key={a} className="capitalize">{a}</th>)}</tr>
              </thead>
              <tbody>
                {RESOURCES.map((resource) => (
                  <tr key={resource}>
                    <td className="capitalize">{resource}</td>
                    {ACTIONS.map((action) => (
                      <td key={action}>
                        <input
                          type="checkbox"
                          checked={matrix[resource][action]}
                          disabled={selected.isSystem && selected.slug === 'owner'}
                          onChange={() => togglePerm(resource, action)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SettingsSection>
      )}
    </div>
  );
}

export function IntegrationCenterPage() {
  const { data, isLoading, refetch } = trpc.settings360.integrations.useQuery();
  const saveHandlers = useSettingsSave(() => refetch());
  const update = trpc.settings360.updateIntegration.useMutation(saveHandlers);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  async function connectStripe() {
    const res = await fetch('/api/stripe/billing', { method: 'POST' });
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  if (isLoading) return <SettingsLoading />;
  if (!data) return null;

  const grouped = data.integrations.reduce<Record<string, typeof data.integrations>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="font-semibold">Migrating from another system?</p>
          <p className="text-sm text-muted-foreground">Upload your client and inventory CSV exports in one place.</p>
        </div>
        <Link href="/app/settings/import" className="btn-primary text-sm">Open import wizard</Link>
      </div>
      {Object.entries(grouped).map(([category, items]) => (
        <SettingsSection key={category} title={roleLabel(category)}>
          <div className="space-y-3">
            {items.map((integration) => (
              <div key={integration.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.configured ? 'Configured' : 'Not configured'}</p>
                </div>
                <div className="flex items-center gap-3">
                  {integration.id === 'stripe' && (
                    <button type="button" className="btn-secondary text-sm" onClick={connectStripe}>Connect Stripe</button>
                  )}
                  {!integration.configured && integration.id !== 'stripe' && (
                    <input
                      className="input text-sm"
                      placeholder="API key"
                      value={apiKeys[integration.id] ?? ''}
                      onChange={(e) => setApiKeys({ ...apiKeys, [integration.id]: e.target.value })}
                    />
                  )}
                  <ToggleField
                    label="Enabled"
                    checked={integration.enabled}
                    onChange={(v) => update.mutate({ integrationId: integration.id, enabled: v, apiKey: apiKeys[integration.id] })}
                  />
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>
      ))}
    </div>
  );
}
