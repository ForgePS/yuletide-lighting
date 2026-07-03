'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type MultiSelectOption<T extends string> = { value: T; label: string };

type MultiSelectDropdownProps<T extends string> = {
  label: string;
  options: MultiSelectOption<T>[];
  values: T[];
  onChange: (values: T[]) => void;
  placeholder?: string;
  className?: string;
};

export function MultiSelectDropdown<T extends string>({
  label,
  options,
  values,
  onChange,
  placeholder = 'All',
  className = '',
}: MultiSelectDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const summary =
    values.length === 0
      ? placeholder
      : values.length === 1
        ? (options.find((o) => o.value === values[0])?.label ?? placeholder)
        : `${label} (${values.length})`;

  function toggle(value: T) {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="inline-flex min-w-[10rem] items-center justify-between gap-2 rounded-full border border-border bg-surface px-3 py-2 text-left text-sm text-foreground shadow-sm hover:border-primary/40"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          aria-label={label}
          className="absolute left-0 z-[100] mt-2 max-h-64 min-w-[14rem] overflow-y-auto rounded-xl border border-border bg-surface p-2 text-foreground shadow-2xl shadow-black/20"
        >
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg bg-surface px-2 py-2 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={values.includes(option.value)}
                onChange={() => toggle(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
          {values.length > 0 && (
            <button
              type="button"
              className="mt-1 w-full rounded-lg bg-surface px-2 py-1.5 text-left text-xs font-medium text-primary hover:bg-muted"
              onClick={() => onChange([])}
            >
              Clear {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
