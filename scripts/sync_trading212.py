"""
Sync every connected user's Trading212 portfolio every 30 minutes by calling the backend's
cron-only endpoint. Run on Raspberry Pi in a tmux session: python sync_trading212.py

Unlike refresh_exchange_rates.py (which calls a Supabase Edge Function directly), this calls
the FastAPI backend itself -- credential decryption happens in the backend process, using a
key that only it holds (T212_ENCRYPTION_KEY), never in Postgres or in Deno.

Requires: pip install requests schedule
"""

import logging
import time

import requests
import schedule

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
BACKEND_URL      = "https://your-backend.onrender.com"   # no trailing slash
API_KEY          = "your-app-api-key"                     # X-API-KEY, same as the rest of the app
JOB_SECRET       = "your-t212-sync-job-secret"             # matches T212_SYNC_JOB_SECRET on the backend
INTERVAL_MINUTES = 30                                      # matches the backend's cron cadence
# ─────────────────────────────────────────────────────────────────────────────


def sync_all() -> None:
    logger.info("Syncing Trading212 connections...")
    try:
        resp = requests.post(
            f"{BACKEND_URL}/trading212/sync-all",
            headers={
                "X-API-KEY": API_KEY,
                "X-Job-Secret": JOB_SECRET,
            },
            timeout=120,  # sequential per-user syncs, each gated by T212's own rate limits
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Done — {data}")
    except requests.HTTPError as e:
        logger.error(f"HTTP error: {e.response.status_code} {e.response.text}")
    except Exception as e:
        logger.error(f"Failed: {e}")


if __name__ == "__main__":
    logger.info(f"Starting — will sync every {INTERVAL_MINUTES} minutes")
    sync_all()  # run once immediately on start

    schedule.every(INTERVAL_MINUTES).minutes.do(sync_all)

    while True:
        schedule.run_pending()
        time.sleep(60)
