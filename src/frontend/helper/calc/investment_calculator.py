# =============================================================================
# INVESTMENT CALCULATOR FUNCTIONS
# =============================================================================
# Reusable calculation functions for investment and compound growth calculations

from typing import Dict, List, Tuple, Union


def calculate_cumulative_growth(
    starting_balance: float,
    periodic_contribution: float,
    contribution_frequency: str,
    years: int,
    annual_return: float,
    annual_inflation: float = 0.0,
    inflation_adjust_contributions: bool = False
) -> Dict[str, Union[List, float]]:
    """
    Calculate cumulative growth with periodic contributions.
    
    Args:
        starting_balance: Initial investment amount
        periodic_contribution: Amount added each period (first year amount)
        contribution_frequency: 'daily', 'weekly', 'monthly', 'quarterly'
        years: Number of years to invest
        annual_return: Expected annual return rate (as decimal, e.g., 0.07 for 7%)
        annual_inflation: Annual inflation rate (as decimal, e.g., 0.03 for 3%)
        inflation_adjust_contributions: If True, contributions increase with inflation each year
    
    Returns:
        Dictionary containing timeline data and summary statistics including inflation-adjusted values
    """
    
    # Define periods per year for each frequency
    frequency_map = {
        'daily': 365,
        'weekly': 52,
        'monthly': 12,
        'quarterly': 4
    }
    
    if contribution_frequency not in frequency_map:
        raise ValueError(f"Invalid frequency. Must be one of: {list(frequency_map.keys())}")
    
    periods_per_year = frequency_map[contribution_frequency]
    total_periods = years * periods_per_year
    period_return = annual_return / periods_per_year
    
    # Initialize tracking lists
    periods = []
    balances = []
    contributions_total = []
    interest_earned = []
    real_value_balances = []  # Inflation-adjusted values
    
    current_balance = starting_balance
    total_contributions = starting_balance
    current_contribution = periodic_contribution
    
    # Calculate for each period
    for period in range(total_periods + 1):
        # Calculate current year for inflation adjustment
        current_year = period // periods_per_year
        
        # Adjust contribution for inflation if enabled
        if inflation_adjust_contributions and current_year > 0:
            adjusted_contribution = periodic_contribution * ((1 + annual_inflation) ** current_year)
        else:
            adjusted_contribution = periodic_contribution
        
        # Record current state
        years_elapsed = period / periods_per_year
        periods.append(years_elapsed)
        balances.append(current_balance)
        contributions_total.append(total_contributions)
        interest_earned.append(current_balance - total_contributions)
        
        # Calculate real (inflation-adjusted) value
        if annual_inflation > 0:
            real_value = current_balance / ((1 + annual_inflation) ** years_elapsed)
        else:
            real_value = current_balance
        real_value_balances.append(real_value)
        
        # Apply growth and add contribution for next period
        if period < total_periods:
            current_balance = current_balance * (1 + period_return) + adjusted_contribution
            total_contributions += adjusted_contribution
    
    # Calculate summary statistics
    final_balance = balances[-1]
    total_contributed = contributions_total[-1]
    total_interest = final_balance - total_contributed
    effective_return = ((final_balance / starting_balance) ** (1/years) - 1) if years > 0 else 0
    
    # Calculate inflation-adjusted final value
    final_real_value = real_value_balances[-1] if real_value_balances else final_balance
    
    return {
        'timeline': {
            'years': periods,
            'balance': balances,
            'contributions': contributions_total,
            'interest': interest_earned,
            'real_value_balance': real_value_balances
        },
        'summary': {
            'final_balance': final_balance,
            'final_real_value': final_real_value,
            'total_contributed': total_contributed,
            'total_interest': total_interest,
            'effective_annual_return': effective_return,
            'years': years,
            'starting_balance': starting_balance,
            'periodic_contribution': periodic_contribution,
            'contribution_frequency': contribution_frequency,
            'target_annual_return': annual_return,
            'annual_inflation': annual_inflation,
            'inflation_adjust_contributions': inflation_adjust_contributions
        }
    }


def format_currency(amount: float, currency_symbol: str = "$") -> str:
    """Format number as currency with appropriate comma separators."""
    return f"{currency_symbol} {amount:,.2f}"


def calculate_retirement_goal(
    target_amount: float,
    current_age: int,
    retirement_age: int,
    current_savings: float,
    annual_return: float,
    contribution_frequency: str = 'monthly',
    annual_inflation: float = 0.0
) -> Dict[str, Union[float, str]]:
    """
    Calculate required periodic contribution to reach retirement goal.
    
    Args:
        target_amount: Desired retirement savings amount (in today's dollars)
        current_age: Current age
        retirement_age: Target retirement age
        current_savings: Current savings amount
        annual_return: Expected annual return rate (as decimal)
        contribution_frequency: How often to contribute
        annual_inflation: Annual inflation rate (as decimal)
    
    Returns:
        Dictionary with required contribution and other metrics
    """
    
    years_to_retirement = retirement_age - current_age
    if years_to_retirement <= 0:
        raise ValueError("Retirement age must be greater than current age")
    
    # Adjust target amount for inflation (future value needed)
    inflation_adjusted_target = target_amount * ((1 + annual_inflation) ** years_to_retirement)
    
    frequency_map = {
        'daily': 365,
        'weekly': 52,
        'monthly': 12,
        'quarterly': 4
    }
    
    periods_per_year = frequency_map[contribution_frequency]
    total_periods = years_to_retirement * periods_per_year
    period_return = annual_return / periods_per_year
    
    # Future value of current savings
    future_value_current = current_savings * ((1 + annual_return) ** years_to_retirement)
    
    # Required additional amount (inflation-adjusted)
    additional_needed = inflation_adjusted_target - future_value_current
    
    if additional_needed <= 0:
        required_contribution = 0
    else:
        # Calculate required periodic payment using annuity formula
        if period_return == 0:
            required_contribution = additional_needed / total_periods
        else:
            # PMT = FV * r / ((1 + r)^n - 1)
            required_contribution = additional_needed * period_return / (
                ((1 + period_return) ** total_periods) - 1
            )
    
    return {
        'required_contribution': required_contribution,
        'years_to_retirement': years_to_retirement,
        'future_value_current_savings': future_value_current,
        'additional_needed': additional_needed,
        'total_contributions_needed': required_contribution * total_periods,
        'contribution_frequency': contribution_frequency,
        'target_amount_today': target_amount,
        'inflation_adjusted_target': inflation_adjusted_target,
        'annual_inflation': annual_inflation
    }


def calculate_debt_payoff(
    principal: float,
    annual_interest_rate: float,
    monthly_payment: float
) -> Dict[str, Union[List, float, int]]:
    """
    Calculate debt payoff schedule with monthly payments.
    
    Args:
        principal: Initial debt amount
        annual_interest_rate: Annual interest rate (as decimal)
        monthly_payment: Monthly payment amount
    
    Returns:
        Dictionary containing payoff schedule and summary
    """
    
    monthly_rate = annual_interest_rate / 12
    
    if monthly_payment <= principal * monthly_rate:
        raise ValueError("Monthly payment too low - debt will never be paid off")
    
    # Initialize tracking
    months = []
    remaining_balance = []
    interest_payments = []
    principal_payments = []
    
    current_balance = principal
    month = 0
    
    while current_balance > 0.01:  # Continue until essentially paid off
        month += 1
        
        # Calculate interest for this month
        interest_payment = current_balance * monthly_rate
        
        # Calculate principal payment
        principal_payment = min(monthly_payment - interest_payment, current_balance)
        
        # Update balance
        current_balance -= principal_payment
        
        # Record data
        months.append(month)
        remaining_balance.append(max(0, current_balance))
        interest_payments.append(interest_payment)
        principal_payments.append(principal_payment)
    
    total_interest = sum(interest_payments)
    total_paid = principal + total_interest
    
    return {
        'schedule': {
            'months': months,
            'remaining_balance': remaining_balance,
            'interest_payments': interest_payments,
            'principal_payments': principal_payments
        },
        'summary': {
            'months_to_payoff': len(months),
            'years_to_payoff': len(months) / 12,
            'total_interest_paid': total_interest,
            'total_amount_paid': total_paid,
            'original_principal': principal,
            'monthly_payment': monthly_payment,
            'annual_interest_rate': annual_interest_rate
        }
    }
