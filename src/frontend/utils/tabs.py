# ==========================================================================
# Enum for tab names used in the budgeting dashboard application.
# ==========================================================================

from enum import Enum

class Tab(Enum):
    OVERVIEW = "Overview"
    MONTHLY_VIEW = "Monthly View"
    YEARLY_VIEW = "Yearly View"
    SAVINGS = "Savings"
    BUDGET = "Budget"
    ACCOUNTS = "Accounts"
    TRANSACTIONS = "Transactions"
    CALCULATORS = "Calculators"
    PROFILE = "Profile"