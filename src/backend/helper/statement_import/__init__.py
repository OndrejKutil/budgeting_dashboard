"""
Bank statement import (CSV / XLSX): turning an uploaded export into reviewable draft rows.

Pure helpers only -- nothing here talks to Supabase except through a client passed in, so the
parsing rules can be unit-tested on synthetic files. See docs/specs/statement-import.md.
"""


class StatementFileError(Exception):
    """A problem with the uploaded file that the user can fix; carries the HTTP status to answer with."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
