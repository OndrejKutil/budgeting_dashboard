import { useMemo, useRef, useState } from 'react';
import type { DailySpendingData } from '@/lib/api/types/base';
import { useUser } from '@/contexts/user-context';

interface Props {
    data: DailySpendingData[];
    year: number;
}

const CELL_SIZE = 13;
const CELL_GAP = 3;
const STEP = CELL_SIZE + CELL_GAP;
const LABEL_OFFSET_Y = 20;
const LABEL_OFFSET_X = 28;
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getIntensity(amount: number, p25: number, p50: number, p75: number): 1 | 2 | 3 | 4 {
    if (amount <= p25) return 1;
    if (amount <= p50) return 2;
    if (amount <= p75) return 3;
    return 4;
}

export function YearlyHeatmap({ data, year }: Props) {
    const { formatCurrency, formatDate } = useUser();
    const wrapRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{ x: number; y: number; day: string; amount: number } | null>(null);

    const { grid, numWeeks, monthLabels } = useMemo(() => {
        const amounts = data.map((d) => d.amount).filter((a) => a > 0).sort((a, b) => a - b);
        const p25 = amounts[Math.floor(amounts.length * 0.25)] ?? 0;
        const p50 = amounts[Math.floor(amounts.length * 0.5)] ?? 0;
        const p75 = amounts[Math.floor(amounts.length * 0.75)] ?? 0;

        const byDay = new Map<string, number>();
        for (const d of data) byDay.set(d.day, d.amount);

        const jan1 = new Date(year, 0, 1);
        const firstDow = jan1.getDay();
        const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const totalDays = isLeap ? 366 : 365;
        const totalCells = totalDays + firstDow;
        const weeks = Math.ceil(totalCells / 7);

        type Cell = { col: number; row: number; date: string; amount: number; intensity: 0 | 1 | 2 | 3 | 4 };
        const cells: Cell[] = [];

        for (let i = 0; i < totalDays; i++) {
            const col = Math.floor((i + firstDow) / 7);
            const row = (i + firstDow) % 7;
            const d = new Date(year, 0, 1 + i);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const amount = byDay.get(iso) ?? 0;
            const intensity = amount > 0 ? getIntensity(amount, p25, p50, p75) : 0;
            cells.push({ col, row, date: iso, amount, intensity });
        }

        const labels: { month: string; col: number }[] = [];
        for (let m = 0; m < 12; m++) {
            const d = new Date(year, m, 1);
            const dayIndex = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
            const col = Math.floor((dayIndex + firstDow) / 7);
            labels.push({ month: MONTH_NAMES[m], col });
        }

        return { grid: cells, numWeeks: weeks, monthLabels: labels };
    }, [data, year]);

    const svgWidth = LABEL_OFFSET_X + numWeeks * STEP;
    const svgHeight = LABEL_OFFSET_Y + 7 * STEP + 4;

    const expenseColor = (intensity: 0 | 1 | 2 | 3 | 4): string => {
        if (intensity === 0) return 'hsl(var(--muted))';
        const stops = ['', 'hsl(var(--chart-expense) / 0.25)', 'hsl(var(--chart-expense) / 0.45)', 'hsl(var(--chart-expense) / 0.65)', 'hsl(var(--chart-expense) / 0.9)'];
        return stops[intensity];
    };

    const handleHover = (e: React.MouseEvent, date: string, amount: number) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, day: date, amount });
    };

    return (
        <div ref={wrapRef} className="relative w-full overflow-x-auto">
            <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                width={svgWidth}
                height={svgHeight}
                style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                className="font-sans select-none"
            >
                {/* Month labels */}
                {monthLabels.map(({ month, col }) => (
                    <text
                        key={month}
                        x={LABEL_OFFSET_X + col * STEP}
                        y={LABEL_OFFSET_Y - 6}
                        fontSize={9}
                        fill="hsl(var(--muted-foreground))"
                    >
                        {month}
                    </text>
                ))}

                {/* Day-of-week labels (Mon, Wed, Fri) */}
                {DAY_LABELS.map((label, row) =>
                    row % 2 === 1 ? (
                        <text
                            key={row}
                            x={LABEL_OFFSET_X - 6}
                            y={LABEL_OFFSET_Y + row * STEP + CELL_SIZE - 2}
                            fontSize={8}
                            textAnchor="end"
                            fill="hsl(var(--muted-foreground))"
                        >
                            {label}
                        </text>
                    ) : null
                )}

                {/* Cells */}
                {grid.map((cell) => (
                    <rect
                        key={cell.date}
                        x={LABEL_OFFSET_X + cell.col * STEP}
                        y={LABEL_OFFSET_Y + cell.row * STEP}
                        width={CELL_SIZE}
                        height={CELL_SIZE}
                        rx={2}
                        ry={2}
                        fill={expenseColor(cell.intensity)}
                        onMouseEnter={(e) => handleHover(e, cell.date, cell.amount)}
                        onMouseMove={(e) => handleHover(e, cell.date, cell.amount)}
                        onMouseLeave={() => setTooltip(null)}
                        className="cursor-default"
                    />
                ))}
            </svg>

            {/* HTML tooltip — positioned in CSS pixels so it tracks correctly regardless of SVG scaling */}
            {tooltip && (
                <div
                    className="pointer-events-none absolute z-10 rounded-md border border-border bg-popover px-2.5 py-1.5 shadow-md whitespace-nowrap"
                    style={{
                        left: Math.min(tooltip.x + 12, (wrapRef.current?.clientWidth ?? 0) - 150),
                        top: Math.max(tooltip.y - 44, 0),
                    }}
                >
                    <p className="text-[10px] text-muted-foreground">
                        {formatDate(tooltip.day, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs font-semibold text-popover-foreground">
                        {tooltip.amount > 0 ? formatCurrency(tooltip.amount) : '—'}
                    </p>
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
                <span>Less</span>
                {([0, 1, 2, 3, 4] as const).map((i) => (
                    <span
                        key={i}
                        className="inline-block rounded-[2px]"
                        style={{ width: CELL_SIZE, height: CELL_SIZE, background: expenseColor(i) }}
                    />
                ))}
                <span>More</span>
            </div>
        </div>
    );
}
