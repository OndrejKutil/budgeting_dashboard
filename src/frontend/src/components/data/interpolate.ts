import { createElement, Fragment, type ReactNode } from 'react';

/**
 * Fills `{name}` placeholders of an i18n template with React nodes (so amounts can carry their
 * own styling and privacy masking). Unknown placeholders are kept as written.
 */
export function interpolate(template: string, values: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((chunk, index) => {
    const name = /^\{(\w+)\}$/.exec(chunk)?.[1];
    const content = name !== undefined && name in values ? values[name] : chunk;
    return createElement(Fragment, { key: index }, content);
  });
}
