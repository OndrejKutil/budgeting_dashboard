"""
Sync every connected user's Trading212 portfolio via the backend's cron-only endpoint.

Unlike refresh_exchange_rates.py (which calls a Supabase Edge Function directly), this calls
the FastAPI backend itself -- credential decryption happens in the backend process, using a
key that only it holds (T212_ENCRYPTION_KEY), never in Postgres or in Deno.

Runs once and exits; scheduled on the Pi by scripts/pi/jobs.conf (job `trading`).
Env: BACKEND_URL, BACKEND_API_KEY, JOB_SECRET.
"""

from _common import env, logger, post


def main() -> None:
    base = env("BACKEND_URL").rstrip("/")

    logger.info("Syncing Trading212 connections...")
    data = post(
        f"{base}/trading212/sync-all",
        headers={"X-API-KEY": env("BACKEND_API_KEY"), "X-Job-Secret": env("JOB_SECRET")},
        timeout=120,  # sequential per-user syncs, each gated by T212's own rate limits
    )
    logger.info(f"Done — {data}")


if __name__ == "__main__":
    main()
