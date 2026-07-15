import { forwardRef, useImperativeHandle, useId, useMemo, useRef, useState, useEffect } from 'react';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import type { SankeyNodeMinimal, SankeyLinkMinimal } from 'd3-sankey';
import { CHART_COLORS, CATEGORY_CHART_COLORS } from '@/lib/chart-colors';
import { useUser } from '@/contexts/user-context';

const MARGIN_LEFT = 140;
const MARGIN_RIGHT = 210;
const MARGIN_Y = 24;

// CSS custom properties the SVG references — resolved to concrete colors for PNG export.
const CSS_VARS = [
    '--foreground', '--muted-foreground', '--card',
    '--chart-income', '--chart-expense', '--chart-savings', '--chart-investment',
    '--chart-neutral', '--chart-core', '--chart-necessary', '--chart-fun', '--chart-future',
];

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
    height?: number;
}

type NodeLayer = 'income' | 'pool' | 'group' | 'sink';
type NodeExtra = { key: string; name: string; layer: NodeLayer; color: string; collapsible?: boolean };
type N = SankeyNodeMinimal<NodeExtra, object> & { value?: number };
type L = SankeyLinkMinimal<NodeExtra, object> & { value: number };

interface TooltipState { x: number; y: number; label: string; value: number; }

const makeSafeIdPart = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = Math.imul(31, hash) + value.charCodeAt(i) | 0;
    }
    const readable = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    return `${readable || 'x'}-${(hash >>> 0).toString(36)}`;
};

const makeLinkGradientId = (chartId: string, sourceKey: string, targetKey: string) =>
    `sk-${chartId}-g-${makeSafeIdPart(sourceKey)}-${makeSafeIdPart(targetKey)}`;

export const SankeyChart = forwardRef<SankeyChartHandle, Props>(function SankeyChart({ data, height = 540 }, ref) {
    const { formatCurrency } = useUser();
    const chartId = makeSafeIdPart(useId());
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(900);
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    const [pinnedKey, setPinnedKey] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [tooltip, setTooltip] = useState<TooltipState | null>(null);
    const effectiveKey = pinnedKey ?? hoverKey;

    const toggleCollapse = (key: string) => setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
    });

    useEffect(() => {
        if (!containerRef.current) return;
        const w = containerRef.current.getBoundingClientRect().width;
        if (w > 0) setWidth(w);
        const ro = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) setWidth(entry.contentRect.width);
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const { nodes, links, childrenByKey } = useMemo(() => {
        const toSorted = (rec: Record<string, number>) =>
            Object.entries(rec).filter(([, v]) => v > 0).sort(([, a], [, b]) => b - a);

        const incomeEntries = toSorted(data.income_by_category);
        const expenseEntries = toSorted(data.expense_by_category);
        const savingEntries = toSorted(data.saving_by_category);
        const investmentEntries = toSorted(data.investment_by_category);

        const totalIncome = incomeEntries.reduce((s, [, v]) => s + v, 0);
        const totalExpenses = expenseEntries.reduce((s, [, v]) => s + v, 0);
        const totalSaving = savingEntries.length ? savingEntries.reduce((s, [, v]) => s + v, 0) : Math.max(0, data.total_saving);
        const totalInvestment = investmentEntries.length ? investmentEntries.reduce((s, [, v]) => s + v, 0) : Math.max(0, data.total_investment);
        const surplus = Math.max(0, totalIncome - totalExpenses - totalSaving - totalInvestment);
        const showSurplus = surplus > totalIncome * 0.005;

        // distinct color per leaf, continuing the palette across all leaves
        let leafIdx = 0;
        const catColor = () => CATEGORY_CHART_COLORS[leafIdx++ % CATEGORY_CHART_COLORS.length];

        const rawNodes: NodeExtra[] = [];
        const rawLinks: Array<{ source: string; target: string; value: number }> = [];

        // L0 — income categories
        incomeEntries.forEach(([name], i) => {
            rawNodes.push({ key: `in:${name}`, name, layer: 'income', color: CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length] });
            rawLinks.push({ source: `in:${name}`, target: 'pool', value: data.income_by_category[name] });
        });
        leafIdx = incomeEntries.length;

        // L1 — pool
        rawNodes.push({ key: 'pool', name: 'Income', layer: 'pool', color: CHART_COLORS.income });

        // L2 — destination groups (same level), each splitting into L3 leaves
        const addGroup = (key: string, name: string, color: string, total: number, entries: [string, number][], prefix: string) => {
            if (total <= 0) return;
            const expanded = entries.length > 0 && !collapsed.has(key);
            rawNodes.push({ key, name, layer: expanded ? 'group' : 'sink', color, collapsible: entries.length > 0 });
            rawLinks.push({ source: 'pool', target: key, value: total });
            if (expanded) {
                entries.forEach(([cn, v]) => {
                    const lk = `${prefix}:${cn}`;
                    rawNodes.push({ key: lk, name: cn, layer: 'sink', color: catColor() });
                    rawLinks.push({ source: key, target: lk, value: v });
                });
            }
        };

        addGroup('g:expenses', 'Expenses', CHART_COLORS.expense, totalExpenses, expenseEntries, 'ex');
        addGroup('g:savings', 'Savings', CHART_COLORS.savings, totalSaving, savingEntries, 'sv');
        addGroup('g:investments', 'Investments', CHART_COLORS.investment, totalInvestment, investmentEntries, 'iv');

        if (showSurplus) {
            rawNodes.push({ key: 'g:surplus', name: 'Surplus', layer: 'sink', color: CHART_COLORS.neutral });
            rawLinks.push({ source: 'pool', target: 'g:surplus', value: surplus });
        }

        const idx = new Map(rawNodes.map((n, i) => [n.key, i]));
        const linksIdx: L[] = rawLinks.map((l) => ({ source: idx.get(l.source)!, target: idx.get(l.target)!, value: l.value }));

        // key → downstream child keys, for subtree highlighting
        const childrenByKey = new Map<string, string[]>();
        rawLinks.forEach((l) => {
            const arr = childrenByKey.get(l.source) ?? [];
            arr.push(l.target);
            childrenByKey.set(l.source, arr);
        });

        return { nodes: rawNodes, links: linksIdx, childrenByKey };
    }, [data, collapsed]);

    const layout = useMemo(() => {
        if (width < 320 || nodes.length === 0) return null;
        return sankey<NodeExtra, object>()
            .nodeWidth(16)
            .nodePadding(12)
            .nodeAlign(sankeyJustify)
            .nodeSort(null) // keep input order so leaves stay grouped by parent (Expenses → Savings → Investments)
            .extent([[MARGIN_LEFT, MARGIN_Y], [width - MARGIN_RIGHT, height - MARGIN_Y]])({
            nodes: nodes.map((d) => ({ ...d })),
            links: links.map((d) => ({ ...d })),
        });
    }, [nodes, links, width, height]);

    // Highlight the active node, its whole downstream subtree, and the links between them.
    const highlight = useMemo(() => {
        if (!effectiveKey) return null;
        const descendants = new Set<string>([effectiveKey]);
        const stack = [effectiveKey];
        while (stack.length) {
            const k = stack.pop()!;
            for (const c of childrenByKey.get(k) ?? []) {
                if (!descendants.has(c)) { descendants.add(c); stack.push(c); }
            }
        }
        const activeNodes = new Set<string>(descendants);
        const activeEdges = new Set<string>();
        childrenByKey.forEach((children, k) => {
            for (const c of children) {
                if ((descendants.has(k) && descendants.has(c)) || c === effectiveKey) {
                    activeEdges.add(`${k}->${c}`);
                    activeNodes.add(k);
                    activeNodes.add(c);
                }
            }
        });
        return { activeNodes, activeEdges };
    }, [effectiveKey, childrenByKey]);

    useImperativeHandle(ref, () => ({
        exportPng: (filename: string) => {
            const svg = svgRef.current;
            if (!svg) return;
            const clone = svg.cloneNode(true) as SVGSVGElement;
            // Inline CSS variables so var(--…) resolves inside the detached image.
            const root = getComputedStyle(document.documentElement);
            const cardStyle = getComputedStyle(document.querySelector('.bg-card') ?? document.body);
            CSS_VARS.forEach((v) => clone.style.setProperty(v, root.getPropertyValue(v)));
            clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            const bg = cardStyle.backgroundColor || '#ffffff';

            const svgStr = new XMLSerializer().serializeToString(clone);
            const scale = 2;
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width * scale;
                canvas.height = height * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    a.click();
                    URL.revokeObjectURL(url);
                }, 'image/png');
            };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
        },
    }), [width, height]);

    if (!layout) return <div ref={containerRef} style={{ height }} />;

    const linkPath = sankeyLinkHorizontal();

    const showTip = (e: React.MouseEvent, label: string, value: number) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label, value });
    };

    return (
        <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
            <svg ref={svgRef} width={width} height={height} onClick={() => setPinnedKey(null)}>
                <defs>
                    {layout.links.map((link) => {
                        const src = link.source as N & NodeExtra;
                        const tgt = link.target as N & NodeExtra;
                        const gid = makeLinkGradientId(chartId, src.key, tgt.key);
                        // userSpaceOnUse with absolute coords so perfectly-horizontal links
                        // (zero-height bounding box) still render their gradient.
                        return (
                            <linearGradient
                                key={gid}
                                id={gid}
                                gradientUnits="userSpaceOnUse"
                                x1={src.x1 ?? 0}
                                y1={0}
                                x2={tgt.x0 ?? 0}
                                y2={0}
                            >
                                <stop offset="0%" stopColor={src.color} stopOpacity={0.5} />
                                <stop offset="100%" stopColor={tgt.color} stopOpacity={0.35} />
                            </linearGradient>
                        );
                    })}
                </defs>

                {/* Links */}
                {layout.links.map((link, i) => {
                    const src = link.source as N & NodeExtra;
                    const tgt = link.target as N & NodeExtra;
                    const gid = makeLinkGradientId(chartId, src.key, tgt.key);
                    const active = !highlight || highlight.activeEdges.has(`${src.key}->${tgt.key}`);
                    return (
                        <path
                            key={i}
                            d={linkPath(link as Parameters<typeof linkPath>[0]) ?? ''}
                            fill="none"
                            stroke={`url(#${gid})`}
                            strokeWidth={Math.max(1, link.width ?? 0)}
                            strokeOpacity={active ? 0.6 : 0.07}
                            style={{ transition: 'stroke-opacity 0.15s' }}
                            onMouseMove={(e) => showTip(e, `${src.name} → ${tgt.name}`, (link as L).value)}
                            onMouseLeave={() => setTooltip(null)}
                        />
                    );
                })}

                {/* Nodes */}
                {layout.nodes.map((node, i) => {
                    const n = node as N & NodeExtra;
                    const x0 = n.x0 ?? 0;
                    const x1 = n.x1 ?? 0;
                    const y0 = n.y0 ?? 0;
                    const y1 = n.y1 ?? 0;
                    const nodeH = Math.max(1, y1 - y0);
                    const midY = (y0 + y1) / 2;
                    const active = !highlight || highlight.activeNodes.has(n.key);
                    const pinned = pinnedKey === n.key;
                    const amount = n.value ?? 0;
                    const labelAbove = n.layer === 'pool' || n.layer === 'group';
                    const isLeft = n.layer === 'income';

                    return (
                        <g
                            key={i}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoverKey(n.key)}
                            onMouseMove={(e) => showTip(e, n.name, amount)}
                            onMouseLeave={() => { setHoverKey(null); setTooltip(null); }}
                            onClick={(e) => { e.stopPropagation(); setPinnedKey((prev) => (prev === n.key ? null : n.key)); }}
                        >
                            <rect
                                x={x0} y={y0}
                                width={x1 - x0} height={nodeH}
                                rx={3}
                                fill={n.color}
                                opacity={active ? 0.95 : 0.2}
                                stroke={pinned ? 'hsl(var(--foreground))' : 'none'}
                                strokeWidth={pinned ? 1.5 : 0}
                                style={{ transition: 'opacity 0.15s' }}
                            />

                            {labelAbove ? (
                                <text
                                    x={(x0 + x1) / 2} y={y0 - 7}
                                    textAnchor="middle" fontSize={11}
                                    fill="hsl(var(--foreground))"
                                    opacity={active ? 1 : 0.3}
                                    style={{ transition: 'opacity 0.15s' }}
                                >
                                    <tspan fontWeight={600}>{n.name}</tspan>
                                    <tspan fill="hsl(var(--muted-foreground))" dx={6} fontSize={10}>{formatCurrency(amount)}</tspan>
                                    {n.collapsible && (
                                        <tspan
                                            dx={7} fontSize={10} fill="hsl(var(--muted-foreground))"
                                            style={{ cursor: 'pointer' }}
                                            onClick={(e) => { e.stopPropagation(); toggleCollapse(n.key); }}
                                        >
                                            {collapsed.has(n.key) ? '▸' : '▾'}
                                        </tspan>
                                    )}
                                </text>
                            ) : (
                                <text
                                    x={isLeft ? x0 - 8 : x1 + 8}
                                    y={midY} dy="0.35em"
                                    textAnchor={isLeft ? 'end' : 'start'}
                                    fontSize={10}
                                    fill="hsl(var(--foreground))"
                                    opacity={active ? 1 : 0.25}
                                    style={{ transition: 'opacity 0.15s' }}
                                >
                                    <tspan>{n.name}</tspan>
                                    <tspan fill="hsl(var(--muted-foreground))" dx={6} fontSize={9}>{formatCurrency(amount)}</tspan>
                                    {n.collapsible && (
                                        <tspan
                                            dx={7} fontSize={10} fill="hsl(var(--muted-foreground))"
                                            style={{ cursor: 'pointer' }}
                                            onClick={(e) => { e.stopPropagation(); toggleCollapse(n.key); }}
                                        >
                                            {collapsed.has(n.key) ? '▸' : '▾'}
                                        </tspan>
                                    )}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>

            {tooltip && (
                <div
                    className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md"
                    style={{ left: Math.min(tooltip.x + 12, width - 160), top: Math.max(tooltip.y - 44, 0) }}
                >
                    <p className="text-[11px] text-muted-foreground">{tooltip.label}</p>
                    <p className="text-xs font-semibold text-popover-foreground">{formatCurrency(tooltip.value)}</p>
                </div>
            )}
        </div>
    );
});
