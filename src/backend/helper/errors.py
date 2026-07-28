"""
Shared error-response helpers.

Used by the global exception handlers in `backend_server.py` to give every error response
(validation, rate limit, unexpected 500) the same `{"detail": str, "error_id": str | None}`
shape that the frontend's `ApiError` expects.
"""

from typing import Any, Mapping, Sequence
from uuid import uuid4


def generate_error_id() -> str:
    """
    Short id to correlate a user-reported error with the matching server log line.

    Not a security token — just long enough to be practically unique and short enough to
    read aloud or paste into a bug report.
    """
    return uuid4().hex[:12]


def flatten_validation_errors(errors: Sequence[Mapping[str, Any]]) -> str:
    """
    Turns Pydantic's raw validation error list into one human-readable sentence.

    Input looks like `[{"loc": ("body", "amount"), "msg": "Input should be greater than 0", ...}]`.
    The leading `body`/`query`/`path` segment in `loc` is a FastAPI implementation detail, not
    something a user typed, so it's dropped from the field name shown to them.
    """
    if not errors:
        return "Invalid request."

    parts: list[str] = []
    for error in errors:
        loc = [str(segment) for segment in error.get("loc", ())]
        if loc and loc[0] in ("body", "query", "path"):
            loc = loc[1:]
        field = ".".join(loc)
        msg = str(error.get("msg", "Invalid value"))
        parts.append(f"{field}: {msg}" if field else msg)

    return "; ".join(parts)
