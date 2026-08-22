'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { createCmsId, type CmsForm, type CmsFormField } from '@clcrm/types';
import { trpc } from '@/lib/trpc';

export function CmsFormsPanel() {
  const utils = trpc.useUtils();
  const { data: forms } = trpc.siteCms.forms.list.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CmsForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const formQuery = trpc.siteCms.forms.get.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId },
  );
  const { data: submissions } = trpc.siteCms.forms.submissions.useQuery(
    { formId: selectedId! },
    { enabled: !!selectedId },
  );

  useEffect(() => {
    if (formQuery.data) setDraft(formQuery.data);
  }, [formQuery.data]);

  const ensure = trpc.siteCms.forms.ensureDefault.useMutation({
    onSuccess: (form) => {
      setSelectedId(form.id);
      void utils.siteCms.forms.list.invalidate();
    },
  });
  const create = trpc.siteCms.forms.create.useMutation({
    onSuccess: (form) => {
      setSelectedId(form.id);
      setNewName('');
      void utils.siteCms.forms.list.invalidate();
    },
  });
  const update = trpc.siteCms.forms.update.useMutation({
    onSuccess: (form) => {
      setDraft(form);
      setMessage('Form saved');
      void utils.siteCms.forms.list.invalidate();
    },
  });
  const remove = trpc.siteCms.forms.delete.useMutation({
    onSuccess: () => {
      setSelectedId(null);
      setDraft(null);
      void utils.siteCms.forms.list.invalidate();
    },
  });
  const updateSub = trpc.siteCms.forms.updateSubmission.useMutation({
    onSuccess: () => void utils.siteCms.forms.submissions.invalidate(),
  });

  function addField(type: CmsFormField['type']) {
    if (!draft) return;
    const field: CmsFormField = {
      id: createCmsId('fld'),
      type,
      label: type === 'consent' ? 'I agree' : type.charAt(0).toUpperCase() + type.slice(1),
      name: `${type}_${draft.fields.length + 1}`,
      required: type !== 'hidden',
      width: 'full',
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined,
    };
    setDraft({ ...draft, fields: [...draft.fields, field] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => ensure.mutate()}>
          Ensure default contact form
        </button>
        <input
          className="rounded-lg border px-3 py-2 text-sm"
          placeholder="New form name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={!newName}
          onClick={() =>
            create.mutate({
              name: newName,
              slug: newName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            })
          }
        >
          <Plus className="h-4 w-4" /> Create form
        </button>
      </div>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[220px_1fr]">
        <aside className="card space-y-1 p-3">
          {forms?.map((form) => (
            <button
              key={form.id}
              type="button"
              className={selectedId === form.id ? 'list-item-active' : 'list-item-idle'}
              onClick={() => setSelectedId(form.id)}
            >
              {form.name}
            </button>
          ))}
        </aside>

        {draft ? (
          <div className="space-y-4">
            <div className="card space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Name</span>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Slug</span>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={draft.slug}
                    onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="mb-1 block font-medium">Success message</span>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={draft.settings.successMessage}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: { ...draft.settings, successMessage: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Submit label</span>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={draft.settings.submitLabel}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: { ...draft.settings, submitLabel: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Notify emails (comma-separated)</span>
                  <input
                    className="w-full rounded border px-2 py-1.5"
                    value={draft.settings.notifyEmails.join(', ')}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: {
                          ...draft.settings,
                          notifyEmails: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.settings.multiStep}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: { ...draft.settings, multiStep: e.target.checked },
                      })
                    }
                  />
                  Multi-step form
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Spam protection</span>
                  <select
                    className="w-full rounded border px-2 py-1.5"
                    value={draft.settings.spamProtection}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        settings: {
                          ...draft.settings,
                          spamProtection: e.target.value as typeof draft.settings.spamProtection,
                        },
                      })
                    }
                  >
                    <option value="none">None</option>
                    <option value="honeypot">Honeypot</option>
                    <option value="turnstile">Turnstile (needs env keys)</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-3">
                {(
                  [
                    'text',
                    'email',
                    'phone',
                    'textarea',
                    'select',
                    'checkbox',
                    'radio',
                    'date',
                    'consent',
                    'signature',
                    'hidden',
                  ] as const
                ).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="rounded-full border px-3 py-1 text-xs"
                    onClick={() => addField(type)}
                  >
                    + {type}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {draft.fields.map((field, index) => (
                  <div key={field.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
                    <input
                      className="rounded border px-2 py-1 text-sm"
                      value={field.label}
                      onChange={(e) => {
                        const fields = [...draft.fields];
                        fields[index] = { ...field, label: e.target.value };
                        setDraft({ ...draft, fields });
                      }}
                    />
                    <code className="text-xs">{field.type}</code>
                    <input
                      className="w-24 rounded border px-1 py-0.5 text-xs"
                      placeholder="name"
                      value={field.name}
                      onChange={(e) => {
                        const fields = [...draft.fields];
                        fields[index] = { ...field, name: e.target.value };
                        setDraft({ ...draft, fields });
                      }}
                    />
                    {draft.settings.multiStep ? (
                      <label className="flex items-center gap-1 text-xs">
                        Step
                        <input
                          type="number"
                          min={1}
                          max={20}
                          className="w-14 rounded border px-1 py-0.5"
                          value={field.step ?? 1}
                          onChange={(e) => {
                            const fields = [...draft.fields];
                            fields[index] = {
                              ...field,
                              step: Math.max(1, Number(e.target.value) || 1),
                            };
                            setDraft({ ...draft, fields });
                          }}
                        />
                      </label>
                    ) : null}
                    <label className="flex items-center gap-1 text-xs">
                      Show if
                      <input
                        className="w-20 rounded border px-1 py-0.5"
                        placeholder="field"
                        value={field.visibleWhen?.field ?? ''}
                        onChange={(e) => {
                          const fields = [...draft.fields];
                          const fieldName = e.target.value;
                          fields[index] = {
                            ...field,
                            visibleWhen: fieldName
                              ? {
                                  field: fieldName,
                                  op: field.visibleWhen?.op ?? 'eq',
                                  value: field.visibleWhen?.value ?? '',
                                }
                              : null,
                          };
                          setDraft({ ...draft, fields });
                        }}
                      />
                      <select
                        className="rounded border px-1 py-0.5"
                        value={field.visibleWhen?.op ?? 'eq'}
                        onChange={(e) => {
                          if (!field.visibleWhen?.field) return;
                          const fields = [...draft.fields];
                          fields[index] = {
                            ...field,
                            visibleWhen: {
                              ...field.visibleWhen,
                              op: e.target.value as NonNullable<typeof field.visibleWhen>['op'],
                            },
                          };
                          setDraft({ ...draft, fields });
                        }}
                      >
                        <option value="eq">=</option>
                        <option value="neq">≠</option>
                        <option value="truthy">truthy</option>
                        <option value="falsy">falsy</option>
                      </select>
                      <input
                        className="w-16 rounded border px-1 py-0.5"
                        placeholder="value"
                        value={field.visibleWhen?.value ?? ''}
                        onChange={(e) => {
                          if (!field.visibleWhen?.field) return;
                          const fields = [...draft.fields];
                          fields[index] = {
                            ...field,
                            visibleWhen: { ...field.visibleWhen, value: e.target.value },
                          };
                          setDraft({ ...draft, fields });
                        }}
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => {
                          const fields = [...draft.fields];
                          fields[index] = { ...field, required: e.target.checked };
                          setDraft({ ...draft, fields });
                        }}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      className="ml-auto text-red-600"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          fields: draft.fields.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() =>
                    update.mutate({
                      id: draft.id,
                      name: draft.name,
                      slug: draft.slug,
                      description: draft.description,
                      fields: draft.fields,
                      settings: draft.settings,
                    })
                  }
                >
                  <Save className="h-4 w-4" /> Save form
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-600"
                  onClick={() => {
                    if (confirm('Delete form?')) remove.mutate({ id: draft.id });
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="card space-y-2 p-4">
              <h3 className="font-semibold">Submissions ({submissions?.length ?? 0})</h3>
              {submissions?.slice(0, 50).map((sub) => (
                <div key={sub.id} className="rounded-lg border p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(sub.createdAt).toLocaleString()}
                    </span>
                    <select
                      className="rounded border px-2 py-1 text-xs"
                      value={sub.status}
                      onChange={(e) =>
                        updateSub.mutate({
                          formId: draft.id,
                          submissionId: sub.id,
                          status: e.target.value as typeof sub.status,
                        })
                      }
                    >
                      {['new', 'read', 'replied', 'spam', 'archived'].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <pre className="overflow-auto whitespace-pre-wrap text-xs">
                    {JSON.stringify(sub.data, null, 2)}
                  </pre>
                </div>
              ))}
              {!submissions?.length ? (
                <p className="text-sm text-muted-foreground">No submissions yet.</p>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select or create a form.</p>
        )}
      </div>
    </div>
  );
}
