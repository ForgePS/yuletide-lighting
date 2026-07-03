'use client';

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/lib/toast';
import { parseCsv } from '@/lib/csv-utils';
import { PillSelect } from '@/components/ui/pill-select';

type ImportEntity = 'customers' | 'contacts' | 'projects' | 'invoices' | 'inventory';

const ENTITY_OPTIONS = [
  { value: 'customers', label: 'Clients (CSV export)' },
  { value: 'contacts', label: 'Contacts (CSV export)' },
  { value: 'projects', label: 'Projects (CSV export)' },
  { value: 'invoices', label: 'Invoices (CSV export)' },
  { value: 'inventory', label: 'Inventory items' },
] as const;

function guessEntityFromFileName(fileName: string): ImportEntity | null {
  const lower = fileName.toLowerCase();
  if (lower.includes('clientexport') || lower.includes('clients')) return 'customers';
  if (lower.includes('contactsexport') || lower.includes('contacts')) return 'contacts';
  if (lower.includes('projectsexport') || lower.includes('projects')) return 'projects';
  if (lower.includes('invoicesexport') || lower.includes('invoices')) return 'invoices';
  if (lower.includes('inventory')) return 'inventory';
  return null;
}

export function DataImportPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [entity, setEntity] = useState<ImportEntity>('customers');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  const preview = trpc.import360.preview.useMutation();
  const runImport = trpc.import360.run.useMutation({
    onSuccess: (result) => {
      toast(`Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`, result.failed ? 'info' : 'success');
    },
    onError: () => toast('Import failed', 'error'),
  });

  async function handleFile(file: File, entityOverride?: ImportEntity) {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.rows.length) {
      toast('No data rows found in CSV', 'error');
      return;
    }

    const guessed = guessEntityFromFileName(file.name);
    const nextEntity = entityOverride ?? guessed ?? entity;

    setFileName(file.name);
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setEntity(nextEntity);
    preview.mutate({ source: 'csv', entity: nextEntity, rows: parsed.rows });
  }

  function reset() {
    setFileName('');
    setRows([]);
    setHeaders([]);
    preview.reset();
    runImport.reset();
    if (fileRef.current) fileRef.current.value = '';
  }

  const previewData = preview.data;
  const requiresClientsFirst = entity === 'projects' || entity === 'invoices' || entity === 'contacts';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Data import</h1>
        <p className="page-subtitle">
          Upload CSV exports to bring clients, projects, invoices, and inventory into Yuletide Lighting.
        </p>
      </div>

      <div className="card space-y-3 p-6 text-sm">
        <h2 className="font-semibold">Recommended import order</h2>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li><strong className="text-foreground">Clients</strong> — client export CSV with name, address, and contact fields</li>
          <li><strong className="text-foreground">Contacts</strong> — optional; fills in missing phone/email on matched clients</li>
          <li><strong className="text-foreground">Projects</strong> — creates proposals linked to clients and site addresses</li>
          <li><strong className="text-foreground">Invoices</strong> — creates invoice history with payments</li>
          <li><strong className="text-foreground">Inventory</strong> — inventory export with SKU, name, category, cost, price, and stock</li>
        </ol>
      </div>

      <div className="card space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <PillSelect
            label="Data type"
            fullWidth
            value={entity}
            onChange={(value) => {
              const next = value as ImportEntity;
              setEntity(next);
              if (rows.length) preview.mutate({ source: 'csv', entity: next, rows });
            }}
            options={[...ENTITY_OPTIONS]}
          />
          <label className="flex items-end gap-2 pb-1">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border"
              checked={skipDuplicates}
              onChange={(e) => setSkipDuplicates(e.target.checked)}
            />
            <span className="text-sm text-muted-foreground">
              {entity === 'customers' || entity === 'inventory'
                ? entity === 'customers'
                  ? 'Update existing clients with the same name or email'
                  : 'Update existing SKUs with latest quantities and prices'
                : 'Skip duplicates on re-import'}
            </span>
          </label>
        </div>

        {requiresClientsFirst ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Import <strong>Clients</strong> first so projects and invoices can match customers by name or email.
          </p>
        ) : null}

        <div
          className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 px-6 py-10 text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
        >
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Drop your CSV export here</p>
          <p className="mt-1 text-sm text-muted-foreground">We auto-detect the file type from the filename</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="mt-4 text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          {fileName ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
              <FileSpreadsheet className="h-4 w-4" />
              {fileName} · {rows.length} rows
            </p>
          ) : null}
        </div>

        {headers.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Detected columns</p>
            <p className="text-xs text-muted-foreground">{headers.join(' · ')}</p>
          </div>
        )}
      </div>

      {preview.isPending && <p className="text-sm text-muted-foreground">Analyzing file…</p>}

      {previewData && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Preview</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Total rows" value={previewData.totalRows} />
            <Stat label="Ready" value={previewData.readyCount} tone="success" />
            <Stat label="Warnings" value={previewData.warningCount} tone="warning" />
            <Stat label="Errors" value={previewData.errorCount} tone="error" />
          </div>

          {previewData.rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="data-table min-w-[640px]">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Record</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="font-mono text-xs">{row.rowNumber}</td>
                      <td>{row.label}</td>
                      <td><StatusBadge status={row.status} /></td>
                      <td className="max-w-md text-xs text-muted-foreground">{row.messages.join(' · ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-primary"
              disabled={!rows.length || runImport.isPending || previewData.errorCount === previewData.totalRows}
              onClick={() => runImport.mutate({ source: 'csv', entity, rows, skipDuplicates })}
            >
              {runImport.isPending ? 'Importing…' : `Import ${previewData.totalRows - previewData.errorCount} records`}
            </button>
            <button type="button" className="btn-secondary" onClick={reset}>Clear file</button>
          </div>

          {runImport.data && (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <p>
                <strong>{runImport.data.imported}</strong> imported
                {runImport.data.updated > 0 && (
                  <> · <strong>{runImport.data.updated}</strong> updated</>
                )}
                {' '}· <strong>{runImport.data.skipped}</strong> skipped · <strong>{runImport.data.failed}</strong> failed
              </p>
              {entity === 'inventory' && runImport.data.imported + runImport.data.updated > 0 && (
                <p className="mt-2">
                  <a href="/app/inventory/items" className="font-medium text-primary hover:underline">View inventory items →</a>
                </p>
              )}
              {runImport.data.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-600">
                  {runImport.data.errors.slice(0, 10).map((err) => (
                    <li key={err.rowNumber}>Row {err.rowNumber}: {err.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card space-y-3 p-6 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Supported CSV formats</h2>
        <ul className="space-y-2">
          <li><strong className="text-foreground">Client export</strong> — Name, Street, City, State, Postal Code, Type, Lead Type, Status, Contact 1/2</li>
          <li><strong className="text-foreground">Contacts export</strong> — First Name, Last Name, Phone, Email, Client Name</li>
          <li><strong className="text-foreground">Projects export</strong> — Project name, client, site address, stage, status, created/updated dates</li>
          <li><strong className="text-foreground">Invoices export</strong> — Invoice #, client, amount, paid, due, status, issue/due dates</li>
          <li><strong className="text-foreground">Inventory export</strong> — SKU, Name, Category, Cost, Single Price, Stock Current</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' | 'error' }) {
  const color =
    tone === 'success' ? 'text-emerald-600' : tone === 'warning' ? 'text-amber-600' : tone === 'error' ? 'text-red-600' : 'text-foreground';
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: 'ready' | 'warning' | 'error' }) {
  if (status === 'ready') {
    return <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Ready</span>;
  }
  if (status === 'warning') {
    return <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" /> Warning</span>;
  }
  return <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" /> Error</span>;
}
