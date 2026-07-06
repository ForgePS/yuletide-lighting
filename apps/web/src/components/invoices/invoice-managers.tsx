'use client';

import { REMINDER_STAGE_LABELS } from '@clcrm/types';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { formatCurrency, riskColor } from '@/lib/invoice-utils';
import { formatDate } from '@clcrm/ui';
import { useToast } from '@/lib/toast';
import { LoadingState, EmptyState } from '@/components/ui/states';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { recordInYear } from '@/lib/year-filter-utils';

export function CollectionsQueue() {
  const { data, isLoading } = trpc.invoices360.collections.list.useQuery();
  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState title="Collection queue empty" description="Invoices 30+ days overdue are automatically queued." />;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="data-table w-full">
        <thead><tr><th>Invoice</th><th>Customer</th><th>Balance</th><th>Days overdue</th><th>Risk</th><th>Score</th></tr></thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td>
                <Link href={`/app/invoices/${item.invoiceId}`} className="font-medium text-primary hover:underline">{item.invoiceNumber}</Link>
              </td>
              <td>{item.customerName ?? '—'}</td>
              <td>{formatCurrency(item.balanceDueCents)}</td>
              <td>{item.daysOverdue}</td>
              <td className={`capitalize font-medium ${riskColor(item.riskLevel)}`}>{item.riskLevel}</td>
              <td>{item.riskScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AgingReportTable() {
  const { data, isLoading } = trpc.invoices360.aging.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {data?.map((bucket) => (
        <div key={bucket.bucket} className="card p-4">
          <p className="text-sm font-semibold">{bucket.label}</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(bucket.balanceDueCents)}</p>
          <p className="text-xs text-muted-foreground">{bucket.invoiceCount} invoices · {bucket.customerCount} customers</p>
          <p className={`mt-1 text-xs capitalize ${riskColor(bucket.riskRating)}`}>Risk: {bucket.riskRating}</p>
        </div>
      ))}
    </div>
  );
}

export function PaymentHistory() {
  const { year } = useAnalyticsYear();
  const { data, isLoading } = trpc.invoices360.payments.listAll.useQuery();
  const payments = useMemo(
    () => (data ?? []).filter((p) => recordInYear(p.paidAt, year)),
    [data, year],
  );
  if (isLoading) return <LoadingState />;
  if (!payments.length) return <EmptyState title="No payments recorded" description="Payments from Stripe or manual entry appear here." />;

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <table className="data-table w-full">
        <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Amount</th><th>Method</th><th>Type</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{formatDate(p.paidAt)}</td>
              <td>
                {p.invoiceId ? (
                  <Link href={`/app/invoices/${p.invoiceId}`} className="font-medium text-primary hover:underline">{p.invoiceNumber}</Link>
                ) : (
                  p.invoiceNumber
                )}
              </td>
              <td>{p.customerName ?? '—'}</td>
              <td>{formatCurrency(p.amountCents)}</td>
              <td className="capitalize">{p.paymentMethod.replace(/_/g, ' ')}</td>
              <td className="capitalize">{p.paymentType}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DisputeManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.invoices360.disputes.list.useQuery();
  const update = trpc.invoices360.disputes.update.useMutation({
    onSuccess: () => { toast('Dispute updated'); utils.invoices360.disputes.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState />;
  if (!data?.length) return <EmptyState title="No disputes" description="Disputes pause reminder automation until resolved." />;

  return (
    <div className="space-y-4">
      {data.map((d) => (
        <div key={d.id} className="card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">Invoice dispute</p>
              <p className="text-sm text-muted-foreground">{d.reason}</p>
              <p className="mt-1 text-xs capitalize">Status: {d.status}</p>
            </div>
            {d.status === 'open' && (
              <button type="button" className="btn-secondary text-sm" onClick={() => update.mutate({ disputeId: d.id, invoiceId: d.invoiceId, status: 'resolved', resolution: 'Resolved by office' })}>
                Resolve
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReminderEngine() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: invoices } = trpc.invoices360.list.useQuery();
  const process = trpc.invoices360.processReminders.useMutation({
    onSuccess: (r) => { toast(`Processed ${r.processed} reminders`); utils.invoices360.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });
  const control = trpc.invoices360.reminders.control.useMutation({
    onSuccess: () => { toast('Reminder updated'); utils.invoices360.list.invalidate(); },
    onError: (e) => toast(e.message, 'error'),
  });

  const open = invoices?.filter((i) => i.balanceDueCents > 0) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary" onClick={() => process.mutate()}>Run reminder engine</button>
      </div>
      <div className="space-y-3">
        {open.slice(0, 10).map((inv) => (
          <div key={inv.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{inv.invoiceNumber} — {inv.customerName}</p>
              <p className="text-sm text-muted-foreground">
                Stage: {inv.reminderStage ? REMINDER_STAGE_LABELS[inv.reminderStage] : 'None'} ·
                {inv.remindersPaused ? ' Paused' : ' Active'}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={() => control.mutate({ invoiceId: inv.id, action: inv.remindersPaused ? 'resume' : 'pause' })}>
                {inv.remindersPaused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={() => control.mutate({ invoiceId: inv.id, action: 'send_manual' })}>Send now</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReminderTemplateManager() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.invoices360.reminders.templates.list.useQuery();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    stage: 'due_today' as const,
    channel: 'email' as const,
    subject: '',
    body: '',
  });
  const create = trpc.invoices360.reminders.templates.create.useMutation({
    onSuccess: () => {
      toast('Reminder template created', 'success');
      utils.invoices360.reminders.templates.list.invalidate();
      setForm({ name: '', stage: 'due_today', channel: 'email', subject: '', body: '' });
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const update = trpc.invoices360.reminders.templates.update.useMutation({
    onSuccess: () => {
      toast('Reminder template updated', 'success');
      utils.invoices360.reminders.templates.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const remove = trpc.invoices360.reminders.templates.delete.useMutation({
    onSuccess: () => {
      toast('Reminder template deleted', 'success');
      utils.invoices360.reminders.templates.list.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState />;
  return (
    <div className="space-y-4">
      <form
        className="card grid gap-3 p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) return;
          create.mutate({
            name: form.name.trim(),
            stage: form.stage,
            channel: form.channel,
            subject: form.subject.trim(),
            body: form.body.trim(),
          });
        }}
      >
        <label className="text-sm">
          <span className="text-muted-foreground">Template name</span>
          <input className="input mt-1 w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm">
            <span className="text-muted-foreground">Stage</span>
            <select className="input mt-1 w-full" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as typeof form.stage })}>
              {Object.entries(REMINDER_STAGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-muted-foreground">Channel</span>
            <select className="input mt-1 w-full" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value as typeof form.channel })}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </label>
        </div>
        <label className="text-sm md:col-span-2">
          <span className="text-muted-foreground">Subject</span>
          <input className="input mt-1 w-full" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="text-muted-foreground">Body</span>
          <textarea className="input mt-1 min-h-[90px] w-full" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="btn-primary text-sm" disabled={create.isPending}>Create reminder template</button>
        </div>
      </form>
      {data?.map((t) => (
        <div key={t.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{t.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">v{t.version} · {t.channel}</span>
              <button type="button" className="btn-secondary text-xs" onClick={() => setEditingId(t.id)}>Edit</button>
              <button
                type="button"
                className="btn-secondary text-xs text-destructive"
                disabled={remove.isPending}
                onClick={() => {
                  if (confirm(`Delete reminder template "${t.name}"?`)) {
                    remove.mutate({ templateId: t.id });
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
          <p className="mt-1 text-sm font-medium">{t.subject}</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</pre>
          {editingId === t.id && (
            <form
              className="mt-3 space-y-2 border-t pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                update.mutate({
                  templateId: t.id,
                  data: {
                    name: String(fd.get('name') || t.name),
                    stage: String(fd.get('stage') || t.stage) as keyof typeof REMINDER_STAGE_LABELS,
                    channel: String(fd.get('channel') || t.channel) as 'email' | 'sms',
                    subject: String(fd.get('subject') || t.subject),
                    body: String(fd.get('body') || t.body),
                  },
                });
              }}
            >
              <div className="grid gap-2 md:grid-cols-3">
                <input name="name" className="input" defaultValue={t.name} />
                <select name="stage" className="input" defaultValue={t.stage}>
                  {Object.entries(REMINDER_STAGE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <select name="channel" className="input" defaultValue={t.channel}>
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                </select>
              </div>
              <input name="subject" className="input w-full" defaultValue={t.subject} />
              <textarea name="body" className="input min-h-[90px] w-full" defaultValue={t.body} />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-xs" disabled={update.isPending}>Save</button>
                <button type="button" className="btn-secondary text-xs" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}

function renderTemplatePlaceholder(fieldKey?: string | null) {
  if (!fieldKey) return 'Field';
  const labels: Record<string, string> = {
    invoiceNumber: '{{invoiceNumber}}',
    customerName: '{{customerName}}',
    dueDate: '{{dueDate}}',
    subtotal: '{{subtotal}}',
    balanceDue: '{{balanceDue}}',
    notes: '{{notes}}',
  };
  return labels[fieldKey] ?? `{{${fieldKey}}}`;
}

export function InvoiceTemplateBuilder() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.invoices360.templates.list.useQuery();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');

  const create = trpc.invoices360.templates.create.useMutation({
    onSuccess: () => {
      toast('Invoice template created', 'success');
      utils.invoices360.templates.list.invalidate();
      setNewTemplateName('');
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const update = trpc.invoices360.templates.update.useMutation({
    onSuccess: () => {
      toast('Invoice template updated', 'success');
      utils.invoices360.templates.list.invalidate();
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const remove = trpc.invoices360.templates.delete.useMutation({
    onSuccess: () => {
      toast('Invoice template deleted', 'success');
      utils.invoices360.templates.list.invalidate();
      setSelectedId(null);
    },
    onError: (e) => toast(e.message, 'error'),
  });

  if (isLoading) return <LoadingState />;
  const templates = data ?? [];
  const selected = templates.find((row) => row.id === selectedId) ?? templates[0] ?? null;

  async function uploadAsset(file: File, field: 'logoUrl' | 'backgroundImageUrl') {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
    if (!res.ok) {
      toast('Upload failed', 'error');
      return;
    }
    const payload = await res.json() as { url?: string };
    if (!payload.url || !selected) return;
    update.mutate({ templateId: selected.id, data: { [field]: payload.url } });
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h2 className="font-semibold">Invoice template visual builder</h2>
        <p className="mt-1 text-sm text-muted-foreground">Create and edit invoice templates with draggable-style blocks, uploaded assets, and HTML content.</p>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTemplateName.trim()) return;
            create.mutate({
              name: newTemplateName.trim(),
              description: '',
              logoUrl: '',
              backgroundImageUrl: '',
              primaryColor: '#DC2626',
              pageWidth: 1024,
              pageHeight: 1325,
              contentHtml: '<h1>Invoice {{invoiceNumber}}</h1>',
              blocks: [],
              isDefault: templates.length === 0,
              isActive: true,
            });
          }}
        >
          <input className="input w-full max-w-sm" placeholder="New invoice template name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={create.isPending}>Create</button>
        </form>
      </div>

      {!templates.length ? (
        <EmptyState title="No invoice templates" description="Create your first visual invoice template above." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="card max-h-[680px] overflow-y-auto p-3">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`mb-2 w-full rounded-lg border px-3 py-2 text-left ${selected?.id === template.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'}`}
                onClick={() => setSelectedId(template.id)}
              >
                <p className="font-medium">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.isDefault ? 'Default' : 'Custom'} · {template.isActive ? 'Active' : 'Inactive'}</p>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4">
              <div className="card grid gap-3 p-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="text-muted-foreground">Template name</span>
                  <input
                    className="input mt-1 w-full"
                    value={selected.name}
                    onChange={(e) => update.mutate({ templateId: selected.id, data: { name: e.target.value } })}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-muted-foreground">Primary color</span>
                  <input
                    className="input mt-1 h-10 w-full"
                    type="color"
                    value={selected.primaryColor}
                    onChange={(e) => update.mutate({ templateId: selected.id, data: { primaryColor: e.target.value } })}
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="text-muted-foreground">Description</span>
                  <input
                    className="input mt-1 w-full"
                    value={selected.description ?? ''}
                    onChange={(e) => update.mutate({ templateId: selected.id, data: { description: e.target.value } })}
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="text-muted-foreground">HTML content editor</span>
                  <textarea
                    className="input mt-1 min-h-[120px] w-full font-mono text-xs"
                    value={selected.contentHtml ?? ''}
                    onChange={(e) => update.mutate({ templateId: selected.id, data: { contentHtml: e.target.value } })}
                  />
                </label>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <label className="btn-secondary cursor-pointer text-sm">
                    Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAsset(file, 'logoUrl');
                      }}
                    />
                  </label>
                  <label className="btn-secondary cursor-pointer text-sm">
                    Upload background
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAsset(file, 'backgroundImageUrl');
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => update.mutate({ templateId: selected.id, data: { isDefault: true } })}
                  >
                    Make default
                  </button>
                  <button
                    type="button"
                    className="btn-secondary text-sm text-destructive"
                    onClick={() => {
                      if (confirm(`Delete template "${selected.name}"?`)) {
                        remove.mutate({ templateId: selected.id });
                      }
                    }}
                  >
                    Delete template
                  </button>
                </div>
              </div>

              <div className="card p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Layout blocks</h3>
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() =>
                      update.mutate({
                        templateId: selected.id,
                        data: {
                          blocks: [
                            ...(selected.blocks ?? []),
                            {
                              id: `block-${Date.now()}`,
                              type: 'text',
                              x: 10,
                              y: 10,
                              width: 30,
                              height: 8,
                              content: 'New block',
                              textSize: 14,
                              align: 'left',
                            },
                          ],
                        },
                      })
                    }
                  >
                    Add block
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {(selected.blocks ?? []).map((block) => (
                    <div key={block.id} className="rounded-lg border p-3 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="input"
                          value={block.type}
                          onChange={(e) =>
                            update.mutate({
                              templateId: selected.id,
                              data: {
                                blocks: (selected.blocks ?? []).map((row) =>
                                  row.id === block.id ? { ...row, type: e.target.value as typeof row.type } : row,
                                ),
                              },
                            })
                          }
                        />
                        <input
                          className="input"
                          placeholder="field key"
                          value={block.fieldKey ?? ''}
                          onChange={(e) =>
                            update.mutate({
                              templateId: selected.id,
                              data: {
                                blocks: (selected.blocks ?? []).map((row) =>
                                  row.id === block.id ? { ...row, fieldKey: e.target.value || null } : row,
                                ),
                              },
                            })
                          }
                        />
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {(['x', 'y', 'width', 'height'] as const).map((key) => (
                          <label key={key} className="text-xs">
                            {key}
                            <input
                              type="number"
                              className="input mt-1"
                              value={block[key]}
                              onChange={(e) =>
                                update.mutate({
                                  templateId: selected.id,
                                  data: {
                                    blocks: (selected.blocks ?? []).map((row) =>
                                      row.id === block.id ? { ...row, [key]: Number(e.target.value) } : row,
                                    ),
                                  },
                                })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <textarea
                        className="input mt-2 min-h-[70px] w-full text-xs"
                        value={block.content ?? ''}
                        onChange={(e) =>
                          update.mutate({
                            templateId: selected.id,
                            data: {
                              blocks: (selected.blocks ?? []).map((row) =>
                                row.id === block.id ? { ...row, content: e.target.value } : row,
                              ),
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        className="btn-secondary mt-2 text-xs text-destructive"
                        onClick={() =>
                          update.mutate({
                            templateId: selected.id,
                            data: { blocks: (selected.blocks ?? []).filter((row) => row.id !== block.id) },
                          })
                        }
                      >
                        Remove block
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-4">
                <h3 className="font-semibold">Preview</h3>
                <div
                  className="relative mt-3 overflow-hidden rounded border bg-white"
                  style={{
                    width: '100%',
                    aspectRatio: `${selected.pageWidth}/${selected.pageHeight}`,
                    backgroundImage: selected.backgroundImageUrl ? `url(${selected.backgroundImageUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {selected.logoUrl && (
                    <img src={selected.logoUrl} alt="Template logo" className="absolute left-4 top-4 h-14 max-w-[200px] object-contain" />
                  )}
                  {(selected.blocks ?? []).map((block) => (
                    <div
                      key={block.id}
                      className="absolute rounded border border-dashed border-primary/50 px-2 py-1 text-xs"
                      style={{
                        left: `${block.x}%`,
                        top: `${block.y}%`,
                        width: `${block.width}%`,
                        height: `${block.height}%`,
                        fontSize: `${block.textSize ?? 12}px`,
                        color: selected.primaryColor,
                        textAlign: block.align ?? 'left',
                      }}
                    >
                      {block.type === 'image' ? '[Image]' : (block.content?.trim() || renderTemplatePlaceholder(block.fieldKey))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CashFlowForecast() {
  const { data, isLoading } = trpc.invoices360.forecasts.useQuery();
  if (isLoading) return <LoadingState />;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {data?.map((f) => (
        <div key={f.horizonDays} className="card p-4">
          <p className="font-semibold">{f.horizonDays}-day forecast</p>
          <p className="mt-2 text-xl font-bold">{formatCurrency(f.expectedCollectionsCents)}</p>
          <p className="text-sm text-muted-foreground">Late risk: {formatCurrency(f.latePaymentRiskCents)}</p>
          <p className="text-sm text-muted-foreground">Seasonal: {formatCurrency(f.seasonalRevenueCents)}</p>
        </div>
      ))}
    </div>
  );
}

export function InvoiceAnalytics() {
  const { filterInput, yearLabel } = useAnalyticsYear();
  const { data, isLoading } = trpc.invoices360.analytics.useQuery(filterInput);
  if (isLoading) return <LoadingState />;
  if (!data) return null;
  const collectedLabel = yearLabel !== 'All time' ? `Collected in ${yearLabel}` : 'Revenue collected';
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Analytics for <span className="font-medium text-foreground">{yearLabel}</span></p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="card p-4"><p className="text-xs text-muted-foreground">{collectedLabel}</p><p className="text-lg font-semibold">{formatCurrency(data.revenueCollectedCents)}</p></div>
      <div className="card p-4"><p className="text-xs text-muted-foreground">Outstanding</p><p className="text-lg font-semibold">{formatCurrency(data.outstandingBalanceCents)}</p></div>
      <div className="card p-4"><p className="text-xs text-muted-foreground">Collection rate</p><p className="text-lg font-semibold">{data.collectionRatePercent}%</p></div>
      <div className="card p-4"><p className="text-xs text-muted-foreground">Avg days to pay</p><p className="text-lg font-semibold">{data.averageDaysToPay}</p></div>
      {data.topOverdueCustomers.length > 0 && (
        <div className="card col-span-full p-4">
          <h3 className="font-semibold">Top overdue customers</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.topOverdueCustomers.map((c) => (
              <li key={c.customerId} className="flex justify-between border-b py-2">
                <span>{c.customerName}</span>
                <span>{formatCurrency(c.balanceCents)} ({c.invoiceCount} invoices)</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </div>
  );
}

export function AICollectionsAssistant() {
  const [question, setQuestion] = useState('Show invoices overdue more than 30 days');
  const { data, refetch, isFetching } = trpc.invoices360.aiQuery.useQuery({ question }, { enabled: false });
  const { toast } = useToast();

  return (
    <div className="card space-y-4 p-6">
      <h2 className="font-semibold">AI Collections Assistant</h2>
      <div className="flex gap-2">
        <input className="input flex-1" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask about collections..." />
        <button type="button" className="btn-primary" disabled={isFetching} onClick={() => { refetch().then(() => toast('Query complete')); }}>Ask</button>
      </div>
      {data && (
        <div className="space-y-3 text-sm">
          <p>{data.answer}</p>
          {data.recommendations.map((r) => <p key={r} className="text-muted-foreground">• {r}</p>)}
          {data.invoices.slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex justify-between border-t py-2">
              <span>{inv.invoiceNumber} — {inv.customerName}</span>
              <span>{formatCurrency(inv.balanceDueCents)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecordPaymentForm() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { data: invoices } = trpc.invoices360.list.useQuery();
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const record = trpc.invoices360.payments.record.useMutation({
    onSuccess: () => { toast('Payment recorded'); utils.invoices360.invalidate(); setAmount(''); },
    onError: (e) => toast(e.message, 'error'),
  });

  const open = invoices?.filter((i) => i.balanceDueCents > 0) ?? [];

  return (
    <form className="card space-y-4 p-6" onSubmit={(e) => {
      e.preventDefault();
      if (!invoiceId || !amount) return;
      record.mutate({
        invoiceId,
        amountCents: Math.round(parseFloat(amount) * 100),
        paymentType: 'partial',
        paymentMethod: 'check',
      });
    }}>
      <h2 className="font-semibold">Record payment</h2>
      <select className="input" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} required>
        <option value="">Select invoice</option>
        {open.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} — {formatCurrency(i.balanceDueCents)} due</option>)}
      </select>
      <input className="input" type="number" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      <button type="submit" className="btn-primary" disabled={record.isPending}>Record payment</button>
    </form>
  );
}

export function InvoiceReportsPage() {
  return (
    <div className="space-y-10">
      <InvoiceAnalytics />
      <CashFlowForecast />
      <AgingReportTable />
      <AICollectionsAssistant />
    </div>
  );
}

export function InvoiceSettingsPage() {
  return (
    <div className="space-y-10">
      <PaymentDateMigrationPanel />
      <InvoiceTemplateBuilder />
      <ReminderEngine />
      <ReminderTemplateManager />
    </div>
  );
}

function PaymentDateMigrationPanel() {
  const { toast } = useToast();
  const [preview, setPreview] = useState<{ payments: number; invoices: number; activity: number } | null>(null);
  const previewRun = trpc.invoices360.shift2026PaymentsTo2025.useMutation({
    onSuccess: (stats) => {
      setPreview(stats);
      toast('Preview complete', 'success');
    },
    onError: (e) => toast(e.message, 'error'),
  });
  const apply = trpc.invoices360.shift2026PaymentsTo2025.useMutation({
    onSuccess: (stats) => {
      setPreview(stats);
      toast(`Updated ${stats.payments} payment(s), ${stats.invoices} invoice date(s)`, 'success');
    },
    onError: (e) => toast(e.message, 'error'),
  });

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="font-semibold">2026 payment date correction</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Moves any payment received in 2026 to the same date in 2025 so revenue and payment history reflect the prior season.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" disabled={previewRun.isPending} onClick={() => previewRun.mutate({ dryRun: true })}>
          {previewRun.isPending ? 'Previewing…' : 'Preview changes'}
        </button>
        <button type="button" className="btn-primary" disabled={apply.isPending} onClick={() => apply.mutate({ dryRun: false })}>
          {apply.isPending ? 'Applying…' : 'Apply correction'}
        </button>
      </div>
      {preview && (
        <p className="text-sm text-muted-foreground">
          {preview.payments} payment record(s), {preview.invoices} invoice paid date(s), {preview.activity} activity record(s) affected.
        </p>
      )}
    </div>
  );
}
