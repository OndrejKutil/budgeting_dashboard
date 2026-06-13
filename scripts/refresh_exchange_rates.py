"""
Refresh exchange rates daily by calling the Supabase Edge Function.
Run on Raspberry Pi in a tmux session: python refresh_exchange_rates.py

Requires: pip install requests schedule
"""

import requests
import schedule
import time
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co"
ANON_KEY     = "your-anon-public-key"
RUN_AT       = "06:00"   # daily refresh time (local time on the Pi)
# ─────────────────────────────────────────────────────────────────────────────


def refresh_rates() -> None:
    logger.info("Refreshing exchange rates...")
    try:
        resp = requests.post(
            f"{SUPABASE_URL}/functions/v1/refresh-exchange-rates",
            headers={
                "Authorization": f"Bearer {ANON_KEY}",
                "Content-Type": "application/json",
            },
            json={},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info(f"Done — {data.get('updated', '?')} pairs updated at {data.get('fetched_at', '?')}")
    except requests.HTTPError as e:
        logger.error(f"HTTP error: {e.response.status_code} {e.response.text}")
    except Exception as e:
        logger.error(f"Failed: {e}")


if __name__ == "__main__":
    logger.info(f"Starting — will refresh rates daily at {RUN_AT}")
    refresh_rates()  # run once immediately on start

    schedule.every().day.at(RUN_AT).do(refresh_rates)

    while True:
        schedule.run_pending()
        time.sleep(60)
