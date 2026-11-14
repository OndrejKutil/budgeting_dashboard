"""
Refresh exchange rates by calling the Supabase Edge Function `refresh-exchange-rates`.

Runs once and exits; scheduled on the Pi by scripts/pi/jobs.conf (job `fx`).
Env: SUPABASE_URL, SUPABASE_ANON_KEY.
"""

from _common import env, logger, post


def main() -> None:
    base = env("SUPABASE_URL").rstrip("/")
    anon_key = env("SUPABASE_ANON_KEY")

    logger.info("Refreshing exchange rates...")
    data = post(
        f"{base}/functions/v1/refresh-exchange-rates",
        headers={"Authorization": f"Bearer {anon_key}", "Content-Type": "application/json"},
        json={},
        timeout=60,
    )
    logger.info(f"Done — {data.get('updated', '?')} pairs updated at {data.get('fetched_at', '?')}")


if __name__ == "__main__":
    main()
