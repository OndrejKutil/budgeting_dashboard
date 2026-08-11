"""
Provider-agnostic wrapper around chat-completion inference calls.

Routers depend on `LLMClient` and `get_llm_client()`, never on a provider SDK directly. Swapping
providers (or adding a second one for a different stage) means changing this file only --
callers are unaffected.
"""

from __future__ import annotations

import abc
import logging
from typing import cast

from groq import APIStatusError, Groq
from groq.types.chat import ChatCompletionMessageParam

from .environment import INFERENCE_API_KEY

logger = logging.getLogger(__name__)

# Mirrors the OpenAI-style chat content shape (plain text, or a list of
# {"type": "text"|"image_url", ...} blocks for vision calls) that every mainstream inference
# provider (Groq, OpenAI, Together, Fireworks, ...) already speaks.
UserContent = str | list[dict]


class LLMProviderError(Exception):
    """
    Raised when the inference provider rejects or fails a request.

    Provider-agnostic on purpose -- callers (routers) catch this without needing to know which
    SDK or exception type sits behind it. `status_code`/`body` are carried through for callers
    that want to react differently to e.g. a rate limit vs. a bad request.
    """

    def __init__(self, message: str, *, status_code: int | None = None, body: object | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class LLMClient(abc.ABC):
    """Chat-completion interface every inference provider implementation must satisfy."""

    @abc.abstractmethod
    def complete_json(
        self,
        *,
        model: str,
        system_prompt: str,
        user_content: UserContent,
        temperature: float = 0.0,
    ) -> str:
        """
        Run one chat completion constrained to JSON output.

        Returns the raw JSON text from the model. Callers own `json.loads` and shape
        validation -- this layer only owns talking to the provider.
        """
        raise NotImplementedError


def _is_retryable(error: LLMProviderError) -> bool:
    """
    Whether one retry is worth it: only Groq's JSON-mode validator rejecting a generation as
    malformed (empirically, the model producing nothing usable at all -- a one-off hiccup, not
    a prompt problem). Not auth errors, not genuinely oversized requests, and not rate limits --
    retrying immediately into a rate limit just burns the remaining budget faster.
    """
    body = error.body
    code = body.get("error", {}).get("code") if isinstance(body, dict) else None
    return code == "json_validate_failed"


class GroqLLMClient(LLMClient):
    """Groq-backed implementation. Used for every stage today -- vision and reasoning alike."""

    def __init__(self, api_key: str = INFERENCE_API_KEY) -> None:
        self._client = Groq(api_key=api_key)

    def complete_json(
        self,
        *,
        model: str,
        system_prompt: str,
        user_content: UserContent,
        temperature: float = 0.0,
    ) -> str:
        try:
            return self._complete_once(
                model=model, system_prompt=system_prompt, user_content=user_content, temperature=temperature
            )
        except LLMProviderError as e:
            if not _is_retryable(e):
                raise
            logger.info(f"Retrying Groq request for model '{model}' once after a JSON-validation failure")
            return self._complete_once(
                model=model, system_prompt=system_prompt, user_content=user_content, temperature=temperature
            )

    def _complete_once(
        self,
        *,
        model: str,
        system_prompt: str,
        user_content: UserContent,
        temperature: float,
    ) -> str:
        # UserContent stays provider-agnostic (str | list[dict]) at the LLMClient boundary, so
        # mypy can't structurally match it against Groq's TypedDict message params -- cast here,
        # confined to this Groq-specific implementation, since the runtime shape is correct.
        messages = cast(
            "list[ChatCompletionMessageParam]",
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        try:
            completion = self._client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                response_format={"type": "json_object"},
            )
        except APIStatusError as e:
            # Logged here, not just re-raised, because this is the only place that ever sees
            # Groq's actual response -- rate-limit headers, the parsed error body, and (when
            # Groq includes one) the model's raw failed_generation. Without this, a failure
            # shows up to the caller as a bare "400 Bad Request" with nothing to diagnose from.
            headers = dict(e.response.headers) if e.response is not None else {}
            rate_limit_headers = {k: v for k, v in headers.items() if "ratelimit" in k.lower() or k.lower() == "retry-after"}
            logger.error(f"Groq request failed for model '{model}': status={e.status_code}")
            logger.info(f"Groq rate-limit headers: {rate_limit_headers}")
            logger.info(f"Groq response body: {e.body}")
            raise LLMProviderError(str(e), status_code=e.status_code, body=e.body) from e

        return completion.choices[0].message.content or ""


def get_llm_client() -> LLMClient:
    """
    Factory for the active inference provider.

    The only line that needs to change to switch providers -- everything upstream is written
    against the `LLMClient` interface, not against Groq.
    """
    return GroqLLMClient()
