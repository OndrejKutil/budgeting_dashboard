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

  const rows: { base_currency: string; target_currency: string; rate: number; fetched_at: string }[] = [];
  const now = new Date().toISOString();

  for (const base of CURRENCIES) {
    const symbols = CURRENCIES.filter(c => c !== base).join(',');
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols}`);

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `Frankfurter API error for ${base}: ${text}` }), { status: 502 });
    }

    const data = await res.json() as { rates: Record<string, number> };

    for (const [target, rate] of Object.entries(data.rates)) {
      rows.push({ base_currency: base, target_currency: target, rate, fetched_at: now });
    }
  }

  const { error } = await supabase
    .from('dim_exchange_rates')
    .upsert(rows, { onConflict: 'base_currency,target_currency' });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ updated: rows.length, fetched_at: now }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
