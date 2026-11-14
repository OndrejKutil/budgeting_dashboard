import { History } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { FieldSource } from '@/lib/api/types';

/**
 * Small provenance note on a field's label row -- silent when the model resolved the field
 * normally, since that's the expected case. "Needs your input" is not shown here: it is the
 * field's error line (icon + text), so it does not rely on colour alone. Clears once the user
 * edits the field (see `updateDraft`), so a fixed field doesn't stay flagged forever.
 */
export function FieldStatus({
  source,
  defaultedLabel,
  fromHistoryLabel,
  fromHistoryHint,
}: {
  source: FieldSource | undefined;
  defaultedLabel: string;
  fromHistoryLabel?: string;
  fromHistoryHint?: string;
}) {
  if (source === 'rule' && fromHistoryLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-sm text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <History className="h-3 w-3" aria-hidden="true" />
            {fromHistoryLabel}
          </button>
        </TooltipTrigger>
        {fromHistoryHint && (
          <TooltipContent>
            <p>{fromHistoryHint}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }
  if (source === 'default') {
    return <span className="text-xs text-muted-foreground">{defaultedLabel}</span>;
  }
  return null;
}
