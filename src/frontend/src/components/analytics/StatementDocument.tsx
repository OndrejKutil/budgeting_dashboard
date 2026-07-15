import { useUser } from '@/contexts/user-context';

export interface StatementLine {
    label: string;
    value: string;
    emphasis?: boolean;
    tone?: 'income' | 'expense' | 'neutral';
}

export interface StatementTable {
    title: string;
    rows: StatementLine[];
    total?: StatementLine;
}

interface Props {
    brand: string;
    title: string;
    period: string;
    summary: StatementLine[];
    tables: StatementTable[];
}

/**
 * Print-only, A4-oriented statement layout. Hidden on screen (see `.print-statement`
 * in index.css); becomes the only visible content when the browser print dialog runs.
 * Styled with explicit black-on-white so it reads like a bank statement regardless of theme.
 */
export function StatementDocument({ brand, title, period, summary, tables }: Props) {
    const { t } = useUser();

    const toneColor = (tone?: StatementLine['tone']) =>
        tone === 'income' ? '#15803d' : tone === 'expense' ? '#b91c1c' : '#111827';

    return (
        <div className="statement-doc" style={{ color: '#111827', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #111827', paddingBottom: '12px', marginBottom: '20px' }}>
                <div>
                    <div style={{ fontSize: '20px', fontWeight: 700 }}>{brand}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>{title}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>{period}</div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {t('statement.generatedOn', { date: new Date().toLocaleDateString() })}
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '8px' }}>
                    {t('statement.summary')}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <tbody>
                        {summary.map((row, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '7px 0', fontWeight: row.emphasis ? 700 : 400 }}>{row.label}</td>
                                <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: row.emphasis ? 700 : 500, fontVariantNumeric: 'tabular-nums', color: toneColor(row.tone) }}>
                                    {row.value}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Category tables */}
            {tables.filter((tbl) => tbl.rows.length > 0).map((tbl, ti) => (
                <div key={ti} style={{ marginBottom: '20px', breakInside: 'avoid' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '6px' }}>
                        {tbl.title}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                        <tbody>
                            {tbl.rows.map((row, ri) => (
                                <tr key={ri} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '5px 0' }}>{row.label}</td>
                                    <td style={{ padding: '5px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.value}</td>
                                </tr>
                            ))}
                            {tbl.total && (
                                <tr style={{ borderTop: '2px solid #111827' }}>
                                    <td style={{ padding: '6px 0', fontWeight: 700 }}>{tbl.total.label}</td>
                                    <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{tbl.total.value}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ))}

            <div style={{ marginTop: '28px', paddingTop: '10px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#9ca3af' }}>
                {t('statement.disclaimer')}
            </div>
        </div>
    );
}
