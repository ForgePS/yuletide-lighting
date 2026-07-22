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
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                selectedId === form.id ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
              }`}
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
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-3">
                {(
                  ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio', 'date', 'consent'] as const
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
                  <div key={field.id} className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50 p-2">
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
