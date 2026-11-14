"""
Post due recurring transactions once a day by calling the backend's cron-only endpoint.
Run on Raspberry Pi in a tmux session: python post_recurring.py

Only templates with "Post automatically" switched on are posted; each posting shows up in the
app's notification bell for review. The work happens in the post_due_recurring() SQL function,
which the backend calls with its service-role client -- the Pi never holds that key, only the
shared job secret (T212_SYNC_JOB_SECRET on the backend, same as sync_trading212.py).

Missing a day (Pi off, backend asleep) is harmless: the next run catches up anything due in the
last 31 days, dated on its own due date.

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
BACKEND_URL = "https://your-backend.onrender.com"   # no trailing slash
API_KEY     = "your-app-api-key"                     # X-API-KEY, same as the rest of the app
JOB_SECRET  = "your-t212-sync-job-secret"            # matches T212_SYNC_JOB_SECRET on the backend
RUN_AT      = "05:00"                                # daily, local time on the Pi
# ─────────────────────────────────────────────────────────────────────────────


def post_due() -> None:
    logger.info("Posting due recurring transactions...")
    try:
        resp = requests.post(
            f"{BACKEND_URL}/recurring/post-due",
            headers={
                "X-API-KEY": API_KEY,
                "X-Job-Secret": JOB_SECRET,
            },
            timeout=120,  # generous: the backend may be cold-starting
        )
        resp.raise_for_status()
        logger.info(f"Done — {resp.json()}")
    except requests.HTTPError as e:
        logger.error(f"HTTP error: {e.response.status_code} {e.response.text}")
    except Exception as e:
        logger.error(f"Failed: {e}")


if __name__ == "__main__":
    logger.info(f"Starting — will post due recurring transactions daily at {RUN_AT}")
    post_due()  # run once immediately on start (safe: never double-posts)

    schedule.every().day.at(RUN_AT).do(post_due)

    while True:
        schedule.run_pending()
        time.sleep(60)
