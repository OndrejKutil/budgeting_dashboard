from datetime import date


def years_with_data(first: date | None, last: date | None, today: date) -> list[int]:
    """
    Years to offer in period pickers, newest first.

    Spans the user's first to last transaction, always including the current year so a
    brand-new account (or one whose data stops in the past) can still pick "now".
    Future-dated transactions extend the range forward.
    """
    start = min(first.year, today.year) if first else today.year
    end = max(last.year, today.year) if last else today.year
    return list(range(end, start - 1, -1))
