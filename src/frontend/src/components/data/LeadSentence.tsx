import { Fragment, type ReactNode } from 'react';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';
import { cn } from '@/lib/utils';
import { interpolate } from './interpolate';

export interface LeadSegment {
  /** i18n template with `{name}` placeholders. */
  template: string;
  values: Record<string, ReactNode>;
}

interface LeadSentenceProps {
  /** Sentences, in reading order. Each one is a separate translated template. */
  segments: LeadSegment[];
  className?: string;
}

/** The plain sentence under a page's big figure; key amounts are set in brighter text. */
export function LeadSentence({ segments, className }: LeadSentenceProps) {
  return (
    <p className={cn('max-w-[44ch] text-base leading-[1.45] text-muted-foreground sm:text-[19px]', className)}>
      {segments.map((segment, index) => (
        <Fragment key={index}>
          {index > 0 && ' '}
          {interpolate(segment.template, segment.values)}
        </Fragment>
      ))}
    </p>
  );
}

interface LeadFigureProps {
  children: ReactNode;
  tone?: 'default' | 'negative';
}

/** A key amount inside a lead sentence: brighter, medium weight, masked in privacy mode. */
export function LeadFigure({ children, tone = 'default' }: LeadFigureProps) {
  return (
    <b className={cn('font-medium tabular-nums', tone === 'negative' ? 'text-destructive' : 'text-foreground')}>
      <SensitiveValue>{children}</SensitiveValue>
    </b>
  );
}
