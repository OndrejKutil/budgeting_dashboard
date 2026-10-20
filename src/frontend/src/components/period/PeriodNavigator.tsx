import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/contexts/user-context';
import { cn } from '@/lib/utils';

interface Props {
    /** 'month' shows month + year and steps by month; 'year' shows only the year and steps by year. */
    mode: 'month' | 'year';
    month?: number; // 1-12, required in month mode
    year: number;
    /** Selectable years, any order (see useAvailableYears). Stepping stops at the ends. */
    years: number[];
    onChange: (month: number, year: number) => void;
    className?: string;
}

const MONTH_INDEXES = Array.from({ length: 12 }, (_, i) => i);

/** ◀ [month] [year] ▶ + a "this month/year" shortcut — shared by every period-driven page. */
export function PeriodNavigator({ mode, month = 1, year, years, onChange, className }: Props) {
    const { formatMonth, t } = useUser();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const isMonthly = mode === 'month';

    const yearOptions = [...new Set([...years, year])].sort((a, b) => b - a);
    const minYear = yearOptions[yearOptions.length - 1];
    const maxYear = yearOptions[0];

    const step = (delta: number) => {
        if (!isMonthly) return onChange(month, year + delta);
        const idx = year * 12 + (month - 1) + delta;
        onChange((idx % 12) + 1, Math.floor(idx / 12));
    };

    const atStart = isMonthly ? year < minYear || (year === minYear && month === 1) : year <= minYear;
    const atEnd = isMonthly ? year > maxYear || (year === maxYear && month === 12) : year >= maxYear;
    const isCurrent = year === currentYear && (!isMonthly || month === currentMonth);

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <div className="flex items-center gap-0.5 bg-card p-1 rounded-xl border border-border shadow-sm">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={atStart}
                    aria-label={t(isMonthly ? 'common.previousMonth' : 'common.previousYear')}
                    onClick={() => step(-1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {isMonthly && (
                    <Select value={String(month)} onValueChange={(v) => onChange(parseInt(v), year)}>
                        <SelectTrigger aria-label={t('common.month')} className="h-8 w-[130px] border-transparent bg-transparent shadow-none hover:bg-muted/60 font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {MONTH_INDEXES.map(i => (
                                <SelectItem key={i} value={String(i + 1)}>{formatMonth(i, 'long')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Select value={String(year)} onValueChange={(v) => onChange(month, parseInt(v))}>
                    <SelectTrigger aria-label={t('common.year')} className="h-8 w-[88px] border-transparent bg-transparent shadow-none hover:bg-muted/60 font-medium">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {yearOptions.map(y => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={atEnd}
                    aria-label={t(isMonthly ? 'common.nextMonth' : 'common.nextYear')}
                    onClick={() => step(1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
            {!isCurrent && (
                <Button variant="ghost" size="sm" className="h-8" onClick={() => onChange(currentMonth, currentYear)}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    {t(isMonthly ? 'common.thisMonth' : 'common.thisYear')}
                </Button>
            )}
        </div>
    );
}
