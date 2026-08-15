"""
Provider-agnostic wrapper around chat-completion inference calls.

Routers depend on `LLMClient` and `get_llm_client()`, never on a provider SDK directly. Swapping
providers (or adding a second one for a different stage) means changing this file only --
callers are unaffected.
"""

from __future__ import annotations

import abc
import logging
from typing import Literal, cast

from groq import APIStatusError, Groq, Omit, omit
from groq.types.chat import ChatCompletionMessageParam

from .environment import INFERENCE_API_KEY

logger = logging.getLogger(__name__)

# Mirrors the OpenAI-style chat content shape (plain text, or a list of
# {"type": "text"|"image_url", ...} blocks for vision calls) that every mainstream inference
# provider (Groq, OpenAI, Together, Fireworks, ...) already speaks.
UserContent = str | list[dict]

# Groq caps a completion at 1024 tokens when the request doesn't say otherwise, and on a
# reasoning model the thinking is spent from that same budget. A model that thinks past the cap
# returns *no* content, which JSON mode then rejects as a 400 `json_validate_failed` carrying an
# empty `failed_generation` -- a truncation that reads like a prompt problem. Every call states
# its own ceiling so that default can never be the thing that breaks a request.
DEFAULT_MAX_COMPLETION_TOKENS = 4096

# `reasoning_effort` is only understood by models that actually reason -- Groq 400s on the rest,
# and our stage-two model (llama-3.3-70b-versatile) is one of the rest. Prefix-matched rather
# than pinned to exact ids so a point upgrade (qwen3.6 -> qwen3.7) doesn't silently stop
# honouring `disable_reasoning`; an unrecognised model just keeps the provider default.
_REASONING_EFFORT_MODEL_PREFIXES = ("qwen/qwen3",)


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
        max_completion_tokens: int = DEFAULT_MAX_COMPLETION_TOKENS,
        disable_reasoning: bool = False,
    ) -> str:
        """
        Run one chat completion constrained to JSON output.

        Returns the raw JSON text from the model. Callers own `json.loads` and shape
        validation -- this layer only owns talking to the provider.

        `max_completion_tokens` must leave room for the whole JSON answer; a truncated
        completion surfaces as an opaque provider 400, not as a partial result.
        `disable_reasoning` asks a reasoning-capable model to answer directly -- worth setting
        for mechanical work (transcription, reformatting) where chain-of-thought earns nothing
        and only competes with the answer for the same token budget. Ignored by providers and
        models that have no such control.
        """
        raise NotImplementedError


def _is_retryable(error: LLMProviderError) -> bool:
    """
    Whether one retry is worth it: only Groq's JSON-mode validator rejecting a generation as
    malformed. Not auth errors, not genuinely oversized requests, and not rate limits --
    retrying immediately into a rate limit just burns the remaining budget faster.

    Worth knowing what this retry can and can't fix. It covers a genuinely flaky generation,
    nothing more: the request goes back out unchanged, so any cause that isn't sampling luck
    reproduces exactly and costs a second call's worth of quota to learn that. The failure that
    looks identical from here but never survives a retry is a completion truncated by
    `max_completion_tokens` -- that one is fixed by giving the call a bigger budget (see
    DEFAULT_MAX_COMPLETION_TOKENS), which is why every caller sets one.
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
        max_completion_tokens: int = DEFAULT_MAX_COMPLETION_TOKENS,
        disable_reasoning: bool = False,
    ) -> str:
        try:
            return self._complete_once(
                model=model,
                system_prompt=system_prompt,
                user_content=user_content,
                temperature=temperature,
                max_completion_tokens=max_completion_tokens,
                disable_reasoning=disable_reasoning,
            )
        except LLMProviderError as e:
            if not _is_retryable(e):
                raise
            logger.info(f"Retrying Groq request for model '{model}' once after a JSON-validation failure")
            return self._complete_once(
                model=model,
                system_prompt=system_prompt,
                user_content=user_content,
                temperature=temperature,
                max_completion_tokens=max_completion_tokens,
                disable_reasoning=disable_reasoning,
            )

    def _complete_once(
        self,
        *,
        model: str,
        system_prompt: str,
        user_content: UserContent,
        temperature: float,
        max_completion_tokens: int,
        disable_reasoning: bool,
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
        # Sent only to models that accept it; `omit` keeps the key out of the request body
        # entirely rather than sending an explicit null, which the rest would reject.
        reasoning_effort: Literal["none"] | Omit = (
            "none" if disable_reasoning and model.startswith(_REASONING_EFFORT_MODEL_PREFIXES) else omit
        )

        try:
            completion = self._client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_completion_tokens=max_completion_tokens,
                reasoning_effort=reasoning_effort,
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

        choice = completion.choices[0]
        content = choice.message.content or ""
        if not content:
            # A 200 with no content means the model spent its whole budget without producing an
            # answer. `finish_reason` is the only thing separating a truncation ("length" -- raise
            # max_completion_tokens) from a model that genuinely emitted nothing ("stop"), and the
            # caller's json.loads would otherwise turn both into the same blank-looking result.
            logger.error(f"Groq returned an empty completion for model '{model}': finish_reason={choice.finish_reason}")
        return content


def get_llm_client() -> LLMClient:
    """
    Factory for the active inference provider.

    The only line that needs to change to switch providers -- everything upstream is written
    against the `LLMClient` interface, not against Groq.
    """
    return GroqLLMClient()
