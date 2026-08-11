/**
 * Supabase Edge Function: refresh-exchange-rates
 *
 * Fetches current exchange rates from Frankfurter (api.frankfurter.dev)
 * and upserts them into dim_exchange_rates. Triggered daily by a scipt running on Raspberry Pi (scripts/refresh_exchange_rates.py)
 * (scripts/refresh_exchange_rates.py) or manually via the Supabase dashboard.
 *
 * Deploy with: supabase functions deploy refresh-exchange-rates
 * (see docs/database/README.md).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CURRENCIES = ['AUD', 'CAD', 'CZK', 'EUR', 'GBP', 'PLN', 'USD'];

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date().toISOString();

  // Fetch all bases in parallel — Frankfurter's per-request latency varies wildly
  // (sub-second to 20s+), and sequential requests were pushing total runtime past
  // the caller's timeout, which aborted the function before the upsert ever ran.
  const results = await Promise.allSettled(
    CURRENCIES.map(async (base) => {
      const symbols = CURRENCIES.filter(c => c !== base).join(',');
      const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols}`);
      if (!res.ok) {
        throw new Error(`Frankfurter API error for ${base}: ${await res.text()}`);
      }
      const data = await res.json() as { rates: Record<string, number> };
      return Object.entries(data.rates).map(([target, rate]) => ({
        base_currency: base,
        target_currency: target,
        rate,
        fetched_at: now,
      }));
    })
  );

  const rows = results
    .filter((r): r is PromiseFulfilledResult<{ base_currency: string; target_currency: string; rate: number; fetched_at: string }[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);

  const failures = results
    .map((r, i) => ({ r, base: CURRENCIES[i] }))
    .filter(({ r }) => r.status === 'rejected')
    .map(({ r, base }) => `${base}: ${(r as PromiseRejectedResult).reason}`);

  // Persist whatever succeeded even if some bases failed — a partial refresh
  // beats none, and previously-good rows for the failed bases are left untouched.
  if (rows.length > 0) {
    const { error } = await supabase
      .from('dim_exchange_rates')
      .upsert(rows, { onConflict: 'base_currency,target_currency' });

    if (error) {
      return new Response(JSON.stringify({ error: error.message, failures }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ updated: rows.length, fetched_at: now, failures }), {
    status: failures.length > 0 ? 207 : 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
