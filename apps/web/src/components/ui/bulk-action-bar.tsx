'use client';

type BulkActionBarProps = {
  selectedCount: number;
  onClear: () => void;
  children: React.ReactNode;
};

export function BulkActionBar({ selectedCount, onClear, children }: BulkActionBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 shadow-sm">
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button type="button" className="btn-ghost ml-auto text-sm" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}
