'use client';

import Link from 'next/link';
import { useToast } from '@/lib/toast';
import { useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAnalyticsYear } from '@/lib/analytics-year-context';
import { proposalInYear } from '@/lib/year-filter-utils';
import {
  INSTALL_TYPE_OPTIONS,
  PIPELINE_COLUMNS,
  PROPOSAL_STAGE_LABELS,
  deriveProposalStage,
  downloadProposalsCsv,
  formatCurrency,
  formatDate,
  labelProposalStatus,
  statusBadgeClass,
  labelInstallType,
} from '@/lib/proposal-utils';
import { EmptyState, LoadingState } from '@/components/ui/states';

const PAGE_SIZES = [20, 50, 100];

export function ProposalListHub() {
  const { toast } = useToast();
  const { year, setYear, yearLabel } = useAnalyticsYear();
  const optionsRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = trpc.proposals360.list.useQuery(undefined, { staleTime: 15_000 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [installFilter, setInstallFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (!proposalInYear(p, year)) return false;
      const normalizedStatus = p.status === 'accepted' ? 'approved' : p.status === 'declined' ? 'rejected' : p.status;
      if (statusFilter && normalizedStatus !== statusFilter) return false;
      if (installFilter && p.installType !== installFilter) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q)
        || (p.customerName ?? '').toLowerCase().includes(q)
        || (p.propertyAddress ?? '').toLowerCase().includes(q)
        || (p.salespersonName ?? '').toLowerCase().includes(q)
        || labelProposalStatus(p.status).toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter, installFilter, year]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalAllTime = (data ?? []).length;
  const hiddenByYear = year != null && totalAllTime > 0 && filtered.length === 0 && !search && !statusFilter && !installFilter;

  function exportCsv() {
    downloadProposalsCsv(filtered);
    setOptionsOpen(false);
    toast(`Exported ${filtered.length} proposals`, 'success');
  }

  if (isLoading) return <LoadingState message="Loading proposals..." />;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className={`shrink-0 lg:w-56 ${filtersOpen ? 'block' : 'hidden lg:block'}`}>
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Filters</h2>
            <button
              type="button"
              className="btn-ghost px-2 py-1 text-xs lg:hidden"
              onClick={() => setFiltersOpen(false)}
            >
              Close
            </button>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              className="input mt-1 w-full"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            >
              <option value="">All statuses</option>
              {PIPELINE_COLUMNS.map((s) => (
                <option key={s} value={s}>{labelProposalStatus(s)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Install type</label>
            <select
              className="input mt-1 w-full"
              value={installFilter}
              onChange={(e) => { setInstallFilter(e.target.value); setPage(1); }}
            >
              <option value="">All types</option>
              {INSTALL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {(statusFilter || installFilter) && (
            <button
              type="button"
              className="btn-ghost w-full text-sm"
              onClick={() => { setStatusFilter(''); setInstallFilter(''); setPage(1); }}
            >
              Clear filters
            </button>
          )}
          <p className="text-xs text-muted-foreground">{filtered.length} proposal{filtered.length === 1 ? '' : 's'}</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="btn-ghost shrink-0 px-2 lg:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-label="Show filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
            <div className="relative min-w-0 flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search proposals, customers, addresses..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="input pl-10"
              />
            </div>
          </div>
          <div className="relative shrink-0" ref={optionsRef}>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1"
              onClick={() => setOptionsOpen((v) => !v)}
            >
              Options
              <ChevronDown className="h-4 w-4" />
            </button>
            {optionsOpen && (
              <>
                <button type="button" className="fixed inset-0 z-40" aria-label="Close menu" onClick={() => setOptionsOpen(false)} />
                <div className="absolute right-0 z-50 mt-1 min-w-[11rem] rounded-xl border border-border bg-surface py-1 shadow-lg">
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm hover:bg-muted" onClick={exportCsv}>
                    Export CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="space-y-3">
            <EmptyState
              title="No proposals found"
              description={
                hiddenByYear
                  ? `No proposals match ${yearLabel}. You have ${totalAllTime} total — try All time or another year using the year filter in the header.`
                  : search || statusFilter || installFilter
                    ? 'Try adjusting your search or filters.'
                    : 'Create your first proposal to get started.'
              }
            />
            {hiddenByYear && (
              <div className="flex justify-center">
                <button type="button" className="btn-secondary" onClick={() => setYear(null)}>
                  Show all proposals
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Proposal</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Sales</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Stage</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Season</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link href={`/app/proposals/${p.id}`} className="font-medium text-primary hover:underline">
                          {p.title}
                        </Link>
                        {p.propertyAddress && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-[220px]">{p.propertyAddress}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.customerName ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{labelInstallType(p.installType)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.salespersonName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(p.status)}`}>
                          {labelProposalStatus(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{PROPOSAL_STAGE_LABELS[deriveProposalStage(p.status)]}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.subtotalCents)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.season ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
              <p className="text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="input py-1.5 text-sm w-auto"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s} value={s}>{s} per page</option>
                  ))}
                </select>
                <button type="button" className="btn-ghost px-3 py-1.5" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <span className="text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <button type="button" className="btn-ghost px-3 py-1.5" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
