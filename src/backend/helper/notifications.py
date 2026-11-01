"""
Operational push notifications via ntfy (https://ntfy.sh).

Only for things the operator has to act on that would otherwise go unnoticed until a user hits
them -- e.g. the inference provider retiring a configured model. Disabled when NTFY_TOPIC_URL is
empty. Sending is best-effort: it never raises, because a failed alert must not turn into a failed
user request on top of whatever went wrong in the first place.
"""

from __future__ import annotations

import logging
import threading
import time

import httpx

from .environment import NTFY_TOKEN, NTFY_TOPIC_URL

logger = logging.getLogger(__name__)

NTFY_TIMEOUT_SECONDS = 5.0

# A retired model fails every single request until someone redeploys, so without a cooldown each
# screenshot upload would buzz the phone again. One ping per model per window is enough to act on.
MODEL_ALERT_COOLDOWN_SECONDS = 6 * 60 * 60

_last_model_alert_at: dict[str, float] = {}
_alert_lock = threading.Lock()


def send_ntfy(
    title: str,
    message: str,
    *,
    priority: str = "high",
    tags: list[str] | None = None,
    topic_url: str | None = None,
    token: str | None = None,
) -> bool:
    """
    POST one notification to the configured ntfy topic. Returns whether it was delivered.

    `topic_url`/`token` default to the env config; they're parameters so tests don't have to
    patch module globals.
    """
    url = NTFY_TOPIC_URL if topic_url is None else topic_url
    auth_token = NTFY_TOKEN if token is None else token
    if not url:
        return False

    # ntfy reads metadata from headers; header values must be latin-1, so anything outside it
    # (a model id never is, but a title might be) is replaced rather than crashing the request.
    headers = {
        "Title": title.encode("latin-1", "replace").decode("latin-1"),
        "Priority": priority,
    }
    if tags:
        headers["Tags"] = ",".join(tags)
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    try:
        response = httpx.post(url, content=message.encode("utf-8"), headers=headers, timeout=NTFY_TIMEOUT_SECONDS)
        response.raise_for_status()
        return True
    except Exception as e:  # noqa: BLE001 -- best-effort by design, see module docstring
        logger.error(f"ntfy notification failed: {type(e).__name__}")
        logger.info(f"ntfy notification failed with error: {e}")
        return False


def alert_model_unavailable(model: str, reason: str, *, now: float | None = None) -> bool:
    """
    Tell the operator that the provider no longer serves `model`, at most once per cooldown.

    Returns whether a notification was sent (False when suppressed by the cooldown, when ntfy
    is disabled, or when sending failed).
    """
    current = time.monotonic() if now is None else now
    with _alert_lock:
        last = _last_model_alert_at.get(model)
        if last is not None and current - last < MODEL_ALERT_COOLDOWN_SECONDS:
            return False
        # Claimed before sending so two concurrent failing requests don't both ping.
        _last_model_alert_at[model] = current

    return send_ntfy(
        "Budgeting dashboard: AI model retired",
        (
            f"The inference provider rejected model '{model}' ({reason}). "
            "Screenshot import is down until INFERENCE_MODEL / REASONING_MODEL is updated "
            "to a model the provider still serves and the backend is redeployed."
        ),
        priority="high",
        tags=["warning", "robot"],
    )


def reset_model_alert_cooldown() -> None:
    """Forget all cooldowns. For tests."""
    with _alert_lock:
        _last_model_alert_at.clear()
