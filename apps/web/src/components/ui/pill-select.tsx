'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type PillSelectOption = { value: string; label: string };
type PillSelectOptionGroup = { label: string; options: PillSelectOption[] };

type PillSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options?: PillSelectOption[];
  optionGroups?: PillSelectOptionGroup[];
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  /** Match form input width and rounded-xl styling */
  fullWidth?: boolean;
};

export function PillSelect({
  label,
  value,
  onChange,
  options = [],
  optionGroups,
  placeholder = 'Select...',
  className = '',
  id,
  required,
  disabled,
  fullWidth = false,
}: PillSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const flatOptions = optionGroups
    ? optionGroups.flatMap((group) => group.options)
    : options;

  const selectedLabel = flatOptions.find((option) => option.value === value)?.label;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function select(next: string) {
    onChange(next);
    setOpen(false);
  }

  const buttonClass = fullWidth
    ? 'input flex w-full items-center justify-between gap-2 text-left'
    : 'inline-flex min-w-[10rem] items-center justify-between gap-2 rounded-full border border-border bg-surface px-3 py-2 text-left text-sm text-foreground shadow-sm hover:border-primary/40';

  return (
    <div ref={rootRef} className={`relative ${fullWidth ? 'block w-full' : 'inline-flex min-w-[10rem] flex-col gap-1'} ${className}`}>
      {label ? (
        <span className={`${fullWidth ? 'mb-1 block text-sm text-muted-foreground' : 'text-xs font-medium text-muted-foreground'}`}>
          {label}
          {required ? ' *' : ''}
        </span>
      ) : null}

      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-required={required}
        className={`${buttonClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
      >
        <span className={selectedLabel ? 'truncate text-foreground' : 'truncate text-muted-foreground'}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label ?? placeholder}
          className={`absolute left-0 z-[100] mt-2 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-2 text-foreground shadow-2xl shadow-black/20 ${
            fullWidth ? 'right-0 w-full' : 'min-w-[14rem]'
          }`}
        >
          {optionGroups
            ? optionGroups.map((group) => (
                <div key={group.label} className="mb-1 last:mb-0">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  {group.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="option"
                      aria-selected={value === option.value}
                      className={`flex w-full rounded-lg bg-surface px-2 py-2 text-left text-sm hover:bg-muted ${
                        value === option.value ? 'bg-primary/10 font-medium text-primary' : 'text-foreground'
                      }`}
                      onClick={() => select(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ))
            : options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  className={`flex w-full rounded-lg bg-surface px-2 py-2 text-left text-sm hover:bg-muted ${
                    value === option.value ? 'bg-primary/10 font-medium text-primary' : 'text-foreground'
                  }`}
                  onClick={() => select(option.value)}
                >
                  {option.label}
                </button>
              ))}
        </div>
      )}
    </div>
  );
}
