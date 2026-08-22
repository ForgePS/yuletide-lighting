'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CrewProfile } from '@clcrm/types';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { roleLabel } from '@/lib/settings-utils';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { Users, UserPlus, Trash2, Crown } from 'lucide-react';

const SKILL_LEVELS = ['junior', 'mid', 'senior', 'lead'] as const;
const FIELD_ROLES = new Set(['installer', 'crew_leader', 'warehouse_staff']);

function userDisplayName(firstName?: string | null, lastName?: string | null, email?: string) {
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return name || email || 'Unknown';
}

function CrewCard({
  crew,
  usersById,
  onUpdated,
}: {
  crew: CrewProfile;
  usersById: Map<string, { firstName?: string | null; lastName?: string | null; email: string; role: string }>;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: crew.name,
    position: crew.position,
    skillLevel: crew.skillLevel,
    availabilityStatus: crew.availabilityStatus,
  });
  const [memberToAdd, setMemberToAdd] = useState('');

  const update = trpc.schedule360.crews.update.useMutation({
    onSuccess: () => {
      toast('Crew updated', 'success');
      utils.schedule360.crews.list.invalidate();
      setEditing(false);
      onUpdated();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const archive = trpc.schedule360.crews.archive.useMutation({
    onSuccess: () => {
      toast('Crew archived', 'success');
      utils.schedule360.crews.list.invalidate();
      onUpdated();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const deleteCrew = trpc.schedule360.crews.delete.useMutation({
    onSuccess: () => {
      toast('Crew deleted', 'success');
      utils.schedule360.crews.list.invalidate();
      onUpdated();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const addMember = trpc.schedule360.crews.addMember.useMutation({
    onSuccess: () => {
      toast('Member added', 'success');
      utils.schedule360.crews.list.invalidate();
      setMemberToAdd('');
      onUpdated();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const removeMember = trpc.schedule360.crews.removeMember.useMutation({
    onSuccess: () => {
      toast('Member removed', 'success');
      utils.schedule360.crews.list.invalidate();
      onUpdated();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const setLeader = trpc.schedule360.crews.update.useMutation({
    onSuccess: () => {
      toast('Crew leader updated', 'success');
      utils.schedule360.crews.list.invalidate();
      onUpdated();
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const availableMembers = [...usersById.entries()]
    .filter(([id, u]) => FIELD_ROLES.has(u.role) && !crew.memberUserIds.includes(id))
    .map(([id, u]) => ({ id, label: userDisplayName(u.firstName, u.lastName, u.email) }));

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex-1 space-y-2">
            <input
              className="input w-full font-semibold"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <input
              className="input w-full text-sm"
              value={draft.position}
              onChange={(e) => setDraft({ ...draft, position: e.target.value })}
            />
          </div>
        ) : (
          <div>
            <h3 className="font-semibold">{crew.name}</h3>
            <p className="text-sm text-muted-foreground capitalize">
              {crew.position} · {crew.skillLevel}
            </p>
          </div>
        )}
        <span className="text-xs capitalize text-muted-foreground whitespace-nowrap">
          {crew.availabilityStatus.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs">
          <span>Utilization</span>
          <span>{crew.utilizationPercent}%</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-muted">
          <div
            className={`h-2 rounded-full ${crew.utilizationPercent > 90 ? 'bg-red-500' : 'bg-primary'}`}
            style={{ width: `${crew.utilizationPercent}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {crew.scheduledHoursWeek}h scheduled / {crew.availableHoursWeek}h available
      </p>

      <div className="mt-4 border-t pt-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="h-4 w-4 text-muted-foreground" />
          Crew members ({crew.memberUserIds.length})
        </div>
        {crew.memberUserIds.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No members assigned yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {crew.memberUserIds.map((userId) => {
              const user = usersById.get(userId);
              const isLeader = crew.leaderUserId === userId;
              return (
                <li key={userId} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {isLeader && <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label="Crew leader" />}
                    <span className="truncate">
                      {user ? userDisplayName(user.firstName, user.lastName, user.email) : userId}
                    </span>
                    {user && (
                      <span className="text-xs text-muted-foreground capitalize">{roleLabel(user.role as never)}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!isLeader && (
                      <button
                        type="button"
                        className="btn-secondary text-xs"
                        disabled={setLeader.isPending}
                        onClick={() => setLeader.mutate({ crewId: crew.id, leaderUserId: userId })}
                      >
                        Make leader
                      </button>
                    )}
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      disabled={removeMember.isPending}
                      onClick={() => removeMember.mutate({ crewId: crew.id, userId })}
                      aria-label="Remove member"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {availableMembers.length > 0 ? (
          <div className="mt-3 flex gap-2">
            <select
              className="input flex-1 text-sm"
              value={memberToAdd}
              onChange={(e) => setMemberToAdd(e.target.value)}
            >
              <option value="">Add crew member…</option>
              {availableMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary shrink-0"
              disabled={!memberToAdd || addMember.isPending}
              onClick={() => addMember.mutate({ crewId: crew.id, userId: memberToAdd })}
            >
              <UserPlus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Invite field crew in{' '}
            <Link href="/app/settings/users" className="text-primary hover:underline">Settings → Users</Link>
            {' '}to assign members.
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        {editing ? (
          <>
            <select
              className="input text-sm"
              value={draft.skillLevel}
              onChange={(e) => setDraft({ ...draft, skillLevel: e.target.value as typeof draft.skillLevel })}
            >
              {SKILL_LEVELS.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={update.isPending || !draft.name.trim()}
              onClick={() => update.mutate({ crewId: crew.id, ...draft })}
            >
              Save
            </button>
            <button type="button" className="btn-secondary text-sm" onClick={() => setEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className="btn-secondary text-sm" onClick={() => setEditing(true)}>Edit crew</button>
            <button
              type="button"
              className="btn-secondary text-sm text-destructive"
              disabled={archive.isPending}
              onClick={() => {
                if (confirm(`Archive "${crew.name}"? It will no longer appear in scheduling.`)) {
                  archive.mutate({ crewId: crew.id });
                }
              }}
            >
              Archive
            </button>
            <button
              type="button"
              className="btn-secondary text-sm text-destructive"
              disabled={deleteCrew.isPending}
              onClick={() => {
                if (confirm(`Delete "${crew.name}" permanently? This cannot be undone.`)) {
                  deleteCrew.mutate({ crewId: crew.id });
                }
              }}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function CrewManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: crews, isLoading } = trpc.schedule360.crews.list.useQuery();
  const { data: users } = trpc.settings360.users.useQuery();
  const [newCrew, setNewCrew] = useState({ name: '', position: 'Installer', skillLevel: 'mid' as const });

  const create = trpc.schedule360.crews.create.useMutation({
    onSuccess: () => {
      toast('Crew created', 'success');
      utils.schedule360.crews.list.invalidate();
      setNewCrew({ name: '', position: 'Installer', skillLevel: 'mid' });
    },
    onError: (e) => toast(e.message, 'error'),
  });

  const usersById = new Map(
    (users ?? [])
      .filter((u) => !u.id.startsWith('invite:') && u.status === 'active')
      .map((u) => [u.firebaseUid || u.id, { firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role }]),
  );

  if (isLoading) return <LoadingState message="Loading crews..." />;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h2 className="font-semibold">Add crew</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create install or service crews, then assign team members from your field staff.
        </p>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newCrew.name.trim()) return;
            create.mutate({
              name: newCrew.name.trim(),
              position: newCrew.position.trim() || 'Installer',
              skillLevel: newCrew.skillLevel,
            });
          }}
        >
          <label className="text-sm">
            <span className="text-muted-foreground">Crew name *</span>
            <input
              className="input mt-1 w-full"
              required
              placeholder="Install Crew C"
              value={newCrew.name}
              onChange={(e) => setNewCrew({ ...newCrew, name: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Position</span>
            <input
              className="input mt-1 w-full"
              value={newCrew.position}
              onChange={(e) => setNewCrew({ ...newCrew, position: e.target.value })}
            />
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Skill level</span>
            <select
              className="input mt-1 w-full capitalize"
              value={newCrew.skillLevel}
              onChange={(e) => setNewCrew({ ...newCrew, skillLevel: e.target.value as typeof newCrew.skillLevel })}
            >
              {SKILL_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={create.isPending}>
              Add crew
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Need to add people first?{' '}
          <Link href="/app/settings/users" className="text-primary hover:underline">Invite crew members in Settings → Users</Link>
          {' '}(installer, crew leader, or warehouse roles).
        </p>
      </div>

      {!crews?.length ? (
        <EmptyState title="No crews yet" description="Add your first crew above to start assigning members." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {crews.map((crew) => (
            <CrewCard
              key={crew.id}
              crew={crew}
              usersById={usersById}
              onUpdated={() => utils.schedule360.crews.list.invalidate()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
