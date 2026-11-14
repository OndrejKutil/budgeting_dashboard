import { History, Sparkles } from 'lucide-react';
import type { FieldSource } from '@/lib/api/types';

/**
 * Marks a category the app filled in (from the user's history or the model) so the user knows
 * to check it. Silent for anything else. Text plus icon, so it never relies on colour alone.
 */
export function SuggestionMarker({ source, label, historyLabel }: { source: FieldSource | undefined; label: string; historyLabel?: string }) {
  if (source !== 'rule' && source !== 'model') return null;
  const fromHistory = source === 'rule';
  const Icon = fromHistory ? History : Sparkles;
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-primary">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {fromHistory && historyLabel ? historyLabel : label}
    </span>
  );
}
