"""
Unit tests for the "inference model retired" ntfy alert.

Two things matter: only a genuinely retired/unknown model triggers it (a rate limit or a bad
request must not page anyone), and a retired model pings once per cooldown rather than on every
failing upload.
"""

import os
import sys

import pytest

current_dir = os.path.dirname(os.path.abspath(__file__))
src_path = os.path.abspath(os.path.join(current_dir, "../../"))
if src_path not in sys.path:
    sys.path.insert(0, src_path)

from backend.helper import notifications  # noqa: E402
from backend.helper.llm_client import LLMProviderError, is_model_unavailable  # noqa: E402


def _err(status, code=None, message="boom"):
    body = {"error": {"message": message, "type": "invalid_request_error", "code": code}}
    return LLMProviderError(message, status_code=status, body=body)


@pytest.mark.parametrize(
    "error",
    [
        _err(400, "model_decommissioned", "The model `x` has been decommissioned and is no longer supported."),
        _err(404, "model_not_found", "The model `x` does not exist or you do not have access to it."),
        _err(400, None, "The model `x` has been decommissioned."),
    ],
)
def test_retired_model_errors_are_detected(error):
    assert is_model_unavailable(error)


@pytest.mark.parametrize(
    "error",
    [
        _err(429, "rate_limit_exceeded", "Rate limit reached for model `x`"),
        _err(400, "json_validate_failed", "Failed to generate JSON"),
        _err(500, None, "Internal error"),
        LLMProviderError("no body", status_code=404, body=None),
    ],
)
def test_other_errors_are_not_detected(error):
    assert not is_model_unavailable(error)


@pytest.fixture
def sent(monkeypatch):
    calls = []
    notifications.reset_model_alert_cooldown()
    monkeypatch.setattr(notifications, "send_ntfy", lambda *a, **k: calls.append((a, k)) or True)
    yield calls
    notifications.reset_model_alert_cooldown()


def test_alert_is_sent_once_per_cooldown(sent):
    assert notifications.alert_model_unavailable("model-a", "model_decommissioned", now=1000.0)
    assert not notifications.alert_model_unavailable("model-a", "model_decommissioned", now=1001.0)
    assert len(sent) == 1
    assert "model-a" in sent[0][0][1]


def test_alert_fires_again_after_cooldown(sent):
    notifications.alert_model_unavailable("model-a", "x", now=0.0)
    notifications.alert_model_unavailable("model-a", "x", now=notifications.MODEL_ALERT_COOLDOWN_SECONDS + 1)
    assert len(sent) == 2


def test_each_model_has_its_own_cooldown(sent):
    notifications.alert_model_unavailable("model-a", "x", now=0.0)
    notifications.alert_model_unavailable("model-b", "x", now=1.0)
    assert len(sent) == 2


def test_send_ntfy_is_disabled_without_topic():
    assert notifications.send_ntfy("t", "m", topic_url="") is False


def test_send_ntfy_posts_to_topic(monkeypatch):
    captured = {}

    class _Resp:
        def raise_for_status(self):
            return None

    def fake_post(url, content, headers, timeout):
        captured.update(url=url, content=content, headers=headers)
        return _Resp()

    monkeypatch.setattr(notifications.httpx, "post", fake_post)
    assert notifications.send_ntfy("Title", "Body", topic_url="https://ntfy.sh/t", token="tok", tags=["warning"])
    assert captured["url"] == "https://ntfy.sh/t"
    assert captured["content"] == b"Body"
    assert captured["headers"]["Authorization"] == "Bearer tok"
    assert captured["headers"]["Tags"] == "warning"


def test_send_ntfy_never_raises(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("network down")

    monkeypatch.setattr(notifications.httpx, "post", boom)
    assert notifications.send_ntfy("t", "m", topic_url="https://ntfy.sh/t") is False
