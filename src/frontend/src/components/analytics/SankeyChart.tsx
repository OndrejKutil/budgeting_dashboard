import { forwardRef, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import type { SankeyNodeMinimal, SankeyLinkMinimal } from 'd3-sankey';
import { useUser } from '@/contexts/user-context';
import { usePrivacyMode } from '@/contexts/privacy-context';
import { SensitiveValue } from '@/components/privacy/SensitiveValue';

/** Margins in rem (labels sit outside the outer columns); converted with the root font size. */
const MARGIN_REM = { left: 10, right: 13, y: 1.5 };

// CSS custom properties the SVG references — resolved to concrete colours for the PNG export.
const CSS_VARS = ['--foreground', '--muted-foreground', '--background', '--primary'];

export interface SankeyInput {
  income_by_category: Record<string, number>;
  expense_by_category: Record<string, number>;
  saving_by_category: Record<string, number>;
  investment_by_category: Record<string, number>;
  total_saving: number;
  total_investment: number;
}

export interface SankeyChartHandle {
  exportPng: (filename: string) => void;
}

interface Props {
  data: SankeyInput;
  /** Accessible name of the chart; leave amounts out in privacy mode. */
  ariaLabel: string;
}

type NodeLayer = 'income' | 'pool' | 'group' | 'sink';
type Tone = 'strong' | 'medium' | 'soft' | 'accent';
type NodeExtra = { key: string; name: string; layer: NodeLayer; tone: Tone; collapsible?: boolean };
type N = SankeyNodeMinimal<NodeExtra, object> & { value?: number };
type L = SankeyLinkMinimal<NodeExtra, object> & { value: number };

interface TooltipState { x: number; y: number; label: string; value: number }

/** Neutral shades for everything, amber only for the flow that stays as cash. */
const NODE_FILL: Record<Tone, string> = {
  strong: 'hsl(var(--foreground) / 0.7)',
  medium: 'hsl(var(--foreground) / 0.45)',
  soft: 'hsl(var(--foreground) / 0.28)',
  accent: 'hsl(var(--primary))',
};
const LINK_STROKE = 'hsl(var(--foreground) / 0.12)';
const LINK_STROKE_ACCENT = 'hsl(var(--primary) / 0.45)';

const rootFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/**
 * Income on the left flows into one pool, then out to expenses, savings, investments and the
 * cash that stays; groups split into their categories (click a group's arrow to fold it).
 * Hover or focus highlights a node and everything downstream; click pins it.
 */
export const SankeyChart = forwardRef<SankeyChartHandle, Props>(function SankeyChart({ data, ariaLabel }, ref) {
  const { formatCurrency, t } = useUser();
  const { isPrivacyMode } = usePrivacyMode();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(0);
  const [rem, setRem] = useState(16);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const effectiveKey = pinnedKey ?? hoverKey;

  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => {
      setWidth(element.clientWidth);
      setRem(rootFontSize());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { nodes, links, childrenByKey, leafCount } = useMemo(() => {
    const toSorted = (rec: Record<string, number>) =>
      Object.entries(rec).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);

    const incomeEntries = toSorted(data.income_by_category);
    const expenseEntries = toSorted(data.expense_by_category);
    const savingEntries = toSorted(data.saving_by_category);
    const investmentEntries = toSorted(data.investment_by_category);

    const totalIncome = incomeEntries.reduce((s, [, v]) => s + v, 0);
    const totalExpenses = expenseEntries.reduce((s, [, v]) => s + v, 0);
    const totalSaving = savingEntries.length ? savingEntries.reduce((s, [, v]) => s + v, 0) : Math.max(0, data.total_saving);
    const totalInvestment = investmentEntries.length
      ? investmentEntries.reduce((s, [, v]) => s + v, 0)
      : Math.max(0, data.total_investment);
    const surplus = Math.max(0, totalIncome - totalExpenses - totalSaving - totalInvestment);
    const showSurplus = surplus > totalIncome * 0.005;

    const rawNodes: NodeExtra[] = [];
    const rawLinks: Array<{ source: string; target: string; value: number }> = [];

    incomeEntries.forEach(([name]) => {
      rawNodes.push({ key: `in:${name}`, name, layer: 'income', tone: 'medium' });
      rawLinks.push({ source: `in:${name}`, target: 'pool', value: data.income_by_category[name] });
    });

    rawNodes.push({ key: 'pool', name: t('metrics.income'), layer: 'pool', tone: 'strong' });

    let leaves = 0;
    const addGroup = (key: string, name: string, total: number, entries: [string, number][], prefix: string) => {
      if (total <= 0) return;
      const expanded = entries.length > 0 && !collapsed.has(key);
      rawNodes.push({ key, name, layer: expanded ? 'group' : 'sink', tone: 'medium', collapsible: entries.length > 0 });
      rawLinks.push({ source: 'pool', target: key, value: total });
      if (expanded) {
        entries.forEach(([category, value]) => {
          const leafKey = `${prefix}:${category}`;
          rawNodes.push({ key: leafKey, name: category, layer: 'sink', tone: 'soft' });
          rawLinks.push({ source: key, target: leafKey, value });
          leaves += 1;
        });
      } else {
        leaves += 1;
      }
    };

    addGroup('g:expenses', t('metrics.expenses'), totalExpenses, expenseEntries, 'ex');
    addGroup('g:savings', t('metrics.savings'), totalSaving, savingEntries, 'sv');
    addGroup('g:investments', t('metrics.investments'), totalInvestment, investmentEntries, 'iv');

    if (showSurplus) {
      rawNodes.push({ key: 'g:surplus', name: t('metrics.cashFlow'), layer: 'sink', tone: 'accent' });
      rawLinks.push({ source: 'pool', target: 'g:surplus', value: surplus });
      leaves += 1;
    }

    const index = new Map(rawNodes.map((n, i) => [n.key, i]));
    const indexedLinks: L[] = rawLinks.map((l) => ({ source: index.get(l.source)!, target: index.get(l.target)!, value: l.value }));

    // key → downstream child keys, for subtree highlighting
    const children = new Map<string, string[]>();
    rawLinks.forEach((l) => {
      const list = children.get(l.source) ?? [];
      list.push(l.target);
      children.set(l.source, list);
    });

    return {
      nodes: rawNodes,
      links: indexedLinks,
      childrenByKey: children,
      leafCount: Math.max(leaves, incomeEntries.length),
    };
  }, [data, collapsed, t]);

  // Taller when there are many categories, so labels never collide.
  const heightRem = Math.max(26, leafCount * 1.75 + 4);
  const height = heightRem * rem;

  const layout = useMemo(() => {
    if (width < 20 * rem || nodes.length === 0) return null;
    return sankey<NodeExtra, object>()
      .nodeWidth(0.75 * rem)
      .nodePadding(0.875 * rem)
      .nodeAlign(sankeyJustify)
      .nodeSort(null) // keep input order so leaves stay grouped by parent (Expenses → Savings → Investments)
      .extent([
        [MARGIN_REM.left * rem, MARGIN_REM.y * rem],
        [width - MARGIN_REM.right * rem, height - MARGIN_REM.y * rem],
      ])({
        nodes: nodes.map((d) => ({ ...d })),
        links: links.map((d) => ({ ...d })),
      });
  }, [nodes, links, width, height, rem]);

  // Highlight the active node, its whole downstream subtree, and the links between them.
  const highlight = useMemo(() => {
    if (!effectiveKey) return null;
    const descendants = new Set<string>([effectiveKey]);
    const stack = [effectiveKey];
    while (stack.length) {
      const key = stack.pop()!;
      for (const child of childrenByKey.get(key) ?? []) {
        if (!descendants.has(child)) {
          descendants.add(child);
          stack.push(child);
        }
      }
    }
    const activeNodes = new Set<string>(descendants);
    const activeEdges = new Set<string>();
    childrenByKey.forEach((children, key) => {
      for (const child of children) {
        if ((descendants.has(key) && descendants.has(child)) || child === effectiveKey) {
          activeEdges.add(`${key}->${child}`);
          activeNodes.add(key);
          activeNodes.add(child);
        }
      }
    });
    return { activeNodes, activeEdges };
  }, [effectiveKey, childrenByKey]);

  useImperativeHandle(
    ref,
    () => ({
      exportPng: (filename: string) => {
        const svg = svgRef.current;
        if (!svg) return;
        const clone = svg.cloneNode(true) as SVGSVGElement;
        // Inline CSS variables so var(--…) resolves inside the detached image.
        const root = getComputedStyle(document.documentElement);
        CSS_VARS.forEach((v) => clone.style.setProperty(v, root.getPropertyValue(v)));
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        const background = getComputedStyle(document.body).backgroundColor || '#ffffff';

        const svgString = new XMLSerializer().serializeToString(clone);
        const scale = 2;
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const context = canvas.getContext('2d');
          if (!context) return;
          context.fillStyle = background;
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (!blob) return;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
          }, 'image/png');
        };
        image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      },
    }),
    [width, height],
  );

  if (!layout) return <div ref={containerRef} className="w-full" style={{ height }} />;

  const linkPath = sankeyLinkHorizontal();
  const nameSize = 0.75 * rem;
  const amountSize = 0.6875 * rem;

  const showTip = (event: React.MouseEvent, label: string, value: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: event.clientX - rect.left, y: event.clientY - rect.top, label, value });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} width={width} height={height} role="img" aria-label={ariaLabel} onClick={() => setPinnedKey(null)} className="block">
        {layout.links.map((link, i) => {
          const source = link.source as N & NodeExtra;
          const target = link.target as N & NodeExtra;
          const active = !highlight || highlight.activeEdges.has(`${source.key}->${target.key}`);
          const accent = target.tone === 'accent';
          return (
            <path
              key={i}
              d={linkPath(link as Parameters<typeof linkPath>[0]) ?? ''}
              fill="none"
              stroke={accent ? LINK_STROKE_ACCENT : LINK_STROKE}
              strokeWidth={Math.max(1, link.width ?? 0)}
              strokeOpacity={active ? 1 : 0.25}
              style={{ transition: 'stroke-opacity 0.15s' }}
              onMouseMove={(event) => showTip(event, `${source.name} → ${target.name}`, (link as L).value)}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {layout.nodes.map((node, i) => {
          const n = node as N & NodeExtra;
          const x0 = n.x0 ?? 0;
          const x1 = n.x1 ?? 0;
          const y0 = n.y0 ?? 0;
          const y1 = n.y1 ?? 0;
          const midY = (y0 + y1) / 2;
          const active = !highlight || highlight.activeNodes.has(n.key);
          const pinned = pinnedKey === n.key;
          const amount = n.value ?? 0;
          const labelAbove = n.layer === 'pool' || n.layer === 'group';
          const isLeft = n.layer === 'income';
          const label = (
            <>
              <tspan fill="hsl(var(--foreground))">{n.name}</tspan>
              {/* A blur filter does not apply to a tspan, so hidden amounts are replaced instead. */}
              <tspan dx={0.375 * rem} fontSize={amountSize} fill="hsl(var(--muted-foreground))">
                {isPrivacyMode ? '••••' : formatCurrency(amount)}
              </tspan>
            </>
          );

          return (
            <g
              key={i}
              tabIndex={0}
              role="button"
              aria-label={isPrivacyMode ? n.name : `${n.name}: ${formatCurrency(amount)}`}
              aria-pressed={pinned}
              className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-primary [&:focus-visible>rect]:[stroke-width:2]"
              onMouseEnter={() => setHoverKey(n.key)}
              onMouseMove={(event) => showTip(event, n.name, amount)}
              onMouseLeave={() => {
                setHoverKey(null);
                setTooltip(null);
              }}
              onFocus={() => setHoverKey(n.key)}
              onBlur={() => setHoverKey(null)}
              onClick={(event) => {
                event.stopPropagation();
                setPinnedKey((prev) => (prev === n.key ? null : n.key));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  if (n.collapsible) toggleCollapse(n.key);
                  else setPinnedKey((prev) => (prev === n.key ? null : n.key));
                }
              }}
            >
              <rect
                x={x0}
                y={y0}
                width={x1 - x0}
                height={Math.max(1, y1 - y0)}
                rx={2}
                fill={NODE_FILL[n.tone]}
                opacity={active ? 1 : 0.3}
                stroke={pinned ? 'hsl(var(--foreground))' : 'none'}
                strokeWidth={pinned ? 1.5 : 0}
                style={{ transition: 'opacity 0.15s' }}
              />
              <text
                x={labelAbove ? (x0 + x1) / 2 : isLeft ? x0 - 0.5 * rem : x1 + 0.5 * rem}
                y={labelAbove ? y0 - 0.5 * rem : midY}
                dy={labelAbove ? undefined : '0.35em'}
                textAnchor={labelAbove ? 'middle' : isLeft ? 'end' : 'start'}
                fontSize={nameSize}
                fontWeight={labelAbove ? 500 : 400}
                opacity={active ? 1 : 0.35}
                style={{ transition: 'opacity 0.15s' }}
              >
                {label}
                {n.collapsible && (
                  <tspan
                    dx={0.4375 * rem}
                    fill="hsl(var(--muted-foreground))"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleCollapse(n.key);
                    }}
                  >
                    {collapsed.has(n.key) ? '▸' : '▾'}
                  </tspan>
                )}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          role="presentation"
          className="glass glass-dense pointer-events-none absolute z-10 rounded-xl px-3 py-2 text-xs"
          style={{ left: Math.min(tooltip.x + 0.75 * rem, width - 11 * rem), top: Math.max(tooltip.y - 3 * rem, 0) }}
        >
          <p className="mb-0.5 text-muted-foreground">{tooltip.label}</p>
          <p className="tabular-nums text-foreground">
            <SensitiveValue>{formatCurrency(tooltip.value)}</SensitiveValue>
          </p>
        </div>
      )}
    </div>
  );
});
