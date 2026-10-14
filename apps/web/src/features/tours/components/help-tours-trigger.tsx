'use client';

import { CircleHelp } from 'lucide-react';
import { useHelpTours } from '../context/help-tours-context';
import { useTour } from '../context/tour-context';

export function HelpToursTrigger({ className }: { className?: string }) {
  const { open } = useHelpTours();
  const { status } = useTour();

  return (
    <button
      type="button"
      onClick={open}
      disabled={status === 'playing'}
      className={
        className
        ?? 'btn-ghost inline-flex items-center gap-1.5 rounded-[var(--radius)] px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground'
      }
      aria-label="Open Help and Tours"
    >
      <CircleHelp className="h-4 w-4" />
      <span className="hidden sm:inline">Help & Tours</span>
    </button>
  );
}
