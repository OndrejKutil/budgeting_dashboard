import { SeriesLineChart } from '@/components/data/SeriesLineChart';
import {
  averageByMonthEnd,
  averageCumulative,
  dailyCumulative,
  formatAxis,
  formatKc,
  SAMPLE_MONTH,
  spentByMonthEnd,
} from './sample-data';

const ariaLabel =
  `Cumulative spending in a sample ${SAMPLE_MONTH.name} ${SAMPLE_MONTH.year} against the six-month average. ` +
  `By day ${SAMPLE_MONTH.days}, spending reached ${formatKc(spentByMonthEnd)} and the average ${formatKc(averageByMonthEnd)}.`;

export function AverageSection() {
  return (
    <section
      aria-labelledby="landing-average"
      className="mt-24 grid items-center gap-x-16 gap-y-8 lg:mt-32 lg:grid-cols-[minmax(0,54fr)_minmax(0,46fr)]"
    >
      <div className="lg:order-2">
        <h2 id="landing-average" className="text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.025em] sm:text-[2rem]">
          Spending, day by day, against your own average.
        </h2>
        <p className="mt-3 max-w-[28rem] text-[1.0625rem] leading-relaxed text-muted-foreground">
          You can tell by the 10th whether this month is running ahead of your usual pace, while there is still time to do something about it.
        </p>
      </div>
      <div className="min-w-0 lg:order-1">
        <SeriesLineChart
          length={SAMPLE_MONTH.days}
          primary={dailyCumulative}
          comparison={averageCumulative}
          formatAxis={formatAxis}
          formatValue={formatKc}
          xLabel={(index) => String(index + 1)}
          tooltipTitle={(index) => `Day ${index + 1}`}
          primaryName={SAMPLE_MONTH.name}
          comparisonName="Six-month average"
          ariaLabel={ariaLabel}
          ignorePrivacy
        />
      </div>
    </section>
  );
}
