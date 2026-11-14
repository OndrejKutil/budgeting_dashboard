"""
Shared helpers for the scheduled jobs in this folder.

Each job is a run-once script: systemd timers on the Raspberry Pi decide *when* it runs
(see scripts/pi/jobs.conf and docs/scripts/README.md). Config and secrets come from
environment variables, which on the Pi are loaded from ~/budget/.env -- never hard-code them,
this repo is public.

A job must exit non-zero on failure so `bd status` shows it as failed; `post()` does that.
"""

import logging
import os
import sys
from typing import Any

import requests

logging.basicConfig(
    level=logging.INFO,
    # No timestamp: journald adds its own. Run locally, the bare lines are fine too.
    format="%(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("job")


def env(name: str) -> str:
    """Return a required environment variable, or exit with a clear message."""
    value = os.environ.get(name, "").strip()
    if not value:
        logger.error(f"Missing environment variable {name} (on the Pi: add it with `bd env`)")
        sys.exit(2)
    return value


def post(url: str, *, headers: dict[str, str], timeout: int, json: Any = None) -> Any:
    """POST and return the JSON body. Logs the error and exits with 1 on any failure."""
    try:
        resp = requests.post(url, headers=headers, json=json, timeout=timeout)
        resp.raise_for_status()
        return resp.json() if resp.content else None
    except requests.HTTPError as e:
        logger.error(f"HTTP {e.response.status_code}: {e.response.text}")
    except (requests.RequestException, ValueError) as e:  # ValueError: body wasn't JSON
        logger.error(f"Request failed: {e}")
    sys.exit(1)
