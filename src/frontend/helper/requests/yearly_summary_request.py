import datetime
import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY


def get_yearly_summary(access_token: str, year: int | None = None) -> dict:
    """Fetch yearly summary data from the backend.
    Currently returns dummy data for development."""
    # Placeholder for real request logic - using dummy data for now
    if year is None:
        year = datetime.datetime.now().year

    months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    income = [3000, 3200, 2800, 3400, 3600, 3900, 4100, 4000, 4200, 4300, 4400, 4500]
    expenses = [1500, 1600, 1700, 1800, 1700, 1900, 2000, 1950, 2100, 2200, 2300, 2400]
    savings = [500, 600, 400, 700, 600, 800, 900, 850, 1000, 1100, 1200, 1300]
    investments = [200, 150, 300, 250, 300, 350, 400, 420, 430, 450, 460, 480]

    return {
        "data": {
            "year": year,
            "months": months,
            "income": income,
            "expenses": expenses,
            "savings": savings,
            "investments": investments,
        }
    }
