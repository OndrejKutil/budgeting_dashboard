"""
Post due recurring transactions via the backend's cron-only endpoint.

Only templates with "Post automatically" switched on are posted; each posting shows up in the
app's notification bell for review. The work happens in the post_due_recurring() SQL function,
which the backend calls with its service-role client -- the Pi never holds that key, only the
shared job secret (T212_SYNC_JOB_SECRET on the backend, same as sync_trading212.py).

Missing a day (Pi off, backend asleep) is harmless: the next run catches up anything due in the
last 31 days, dated on its own due date. Running twice is safe: it never double-posts.

Runs once and exits; scheduled on the Pi by scripts/pi/jobs.conf (job `recurring`).
Env: BACKEND_URL, BACKEND_API_KEY, JOB_SECRET.
"""

from _common import env, logger, post


def main() -> None:
    base = env("BACKEND_URL").rstrip("/")

    logger.info("Posting due recurring transactions...")
    data = post(
        f"{base}/recurring/post-due",
        headers={"X-API-KEY": env("BACKEND_API_KEY"), "X-Job-Secret": env("JOB_SECRET")},
        timeout=120,  # generous: the backend may be cold-starting
    )
    logger.info(f"Done — {data}")


if __name__ == "__main__":
    main()
