# =============================================================================
# CALCULATORS TAB
# =============================================================================
# Financial calculators including compound growth, retirement planning, and more

from dash import html, dcc, Input, Output, State, callback
import plotly.graph_objects as go
import plotly.express as px
from helper.calc.investment_calculator import (
    calculate_cumulative_growth, 
    calculate_retirement_goal, 
    calculate_debt_payoff, 
    format_currency
)
from utils.currency import CURRENCY_SYMBOLS
from utils.colors import COLORS
import dash_bootstrap_components as dbc


def create_calculators_tab():
    """Create the calculators tab with various financial calculators."""
    
    return html.Div([
        html.H2("Financial Calculators", className="page-title"),
        
        # Calculator tabs
        dbc.Tabs([
            dbc.Tab(
                label="Compound Growth Calculator",
                tab_id="compound-growth-tab",
            ),
            dbc.Tab(
                label="Retirement Calculator",
                tab_id="retirement-tab",
            ),
            dbc.Tab(
                label="Debt Payoff Calculator",
                tab_id="debt-payoff-tab",
            )
        ], id="calculator-tabs", active_tab="compound-growth-tab"),
        
        html.Div(id="calculator-content", className="mt-4")
    ], className="tab-content")


def create_compound_growth_calculator():
    """Create the compound growth calculator interface."""
    
    return html.Div([
        dbc.Row([
            # Input controls
            dbc.Col([
                html.H4("Investment Parameters", className="mb-3"),
                
                # Starting balance
                html.Div([
                    html.Label("Starting Balance", className="form-label"),
                    dbc.Input(
                        id="starting-balance-input",
                        type="number",
                        value=10_000,
                        min=0,
                        step=1000,
                        className="mb-3"
                    )
                ], className="growth-input-field"),
                
                # Periodic contribution
                html.Div([
                    html.Label("Regular Contribution", className="form-label"),
                    dbc.Input(
                        id="contribution-input",
                        type="number",
                        value=1_000,
                        min=0,
                        step=250,
                        className="mb-3"
                    )
                ], className="growth-input-field"),

                # Periodic contribution
                html.Div([
                    html.Label("Contribution Frequency", className="form-label"),
                    dbc.Select(
                        id="frequency-select",
                        options=[
                            {"label": "Daily", "value": "daily"},
                            {"label": "Weekly", "value": "weekly"},
                            {"label": "Monthly", "value": "monthly"},
                            {"label": "Quarterly", "value": "quarterly"}
                        ],
                        value="monthly",
                        className="mb-3"
                    )
                ], className="growth-input-field"),

                # Years investing
                html.Div([
                    html.Label("Years Investing", className="form-label"),
                    dbc.Input(
                        id="years-input",
                        type="number",
                        value=10,
                        min=1,
                        step=1,
                        className="mb-3"
                    )
                ], className="growth-input-field"),

                # Years investing
                html.Div([
                    html.Label("Expected Annual Return (%)", className="form-label"),
                    dbc.Input(
                        id="return-input",
                        type="number",
                        value=7.0,
                        min=0,
                        step=0.5,
                        className="mb-3"
                    )
                ], className="growth-input-field")
                
            ], width=4),
            
            # Results display
            dbc.Col([
                html.H4("Growth Projection", className="mb-3"),
                
                # Summary cards
                html.Div(id="summary-cards", className="mb-4"),
                
                # Chart
                html.Div([
                    dcc.Graph(id="growth-chart")
                ])
                
            ], width=8)
        ])
    ])


def create_retirement_calculator():
    """Create the retirement calculator interface."""
    
    return html.Div([
        dbc.Row([
            # Input controls
            dbc.Col([
                html.H4("Retirement Planning Parameters", className="mb-3"),
                
                # Target retirement amount
                html.Div([
                    html.Label("Target Retirement Amount", className="form-label"),
                    dbc.Input(
                        id="target-amount-input",
                        type="number",
                        value=1000000,
                        min=0,
                        step=10000,
                        className="mb-3"
                    )
                ], className="growth-input-field"),
                
                # Current age
                html.Div([
                    html.Label("Current Age", className="form-label"),
                    dbc.Input(
                        id="current-age-input",
                        type="number",
                        value=30,
                        min=18,
                        max=100,
                        step=1,
                        className="mb-3"
                    )
                ], className="growth-input-field"),
                
                # Retirement age
                html.Div([
                    html.Label("Retirement Age", className="form-label"),
                    dbc.Input(
                        id="retirement-age-input",
                        type="number",
                        value=65,
                        min=18,
                        max=100,
                        step=1,
                        className="mb-3"
                    )
                ], className="growth-input-field"),
                
                # Current savings
                html.Div([
                    html.Label("Current Savings", className="form-label"),
                    dbc.Input(
                        id="current-savings-input",
                        type="number",
                        value=50000,
                        min=0,
                        step=1000,
                        className="mb-3"
                    )
                ], className="growth-input-field"),
                
                # Expected annual return
                html.Div([
                    html.Label("Expected Annual Return (%)", className="form-label"),
                    dbc.Input(
                        id="retirement-return-input",
                        type="number",
                        value=7.0,
                        min=0,
                        max=30,
                        step=0.1,
                        className="mb-3"
                    )
                ], className="growth-input-field"),
                
                # Contribution frequency
                html.Div([
                    html.Label("Contribution Frequency", className="form-label"),
                    dbc.Select(
                        id="retirement-frequency-select",
                        options=[
                            {"label": "Monthly", "value": "monthly"},
                            {"label": "Quarterly", "value": "quarterly"},
                        ],
                        value="monthly",
                        className="mb-3"
                    )
                ], className="growth-input-field")
                
            ], width=4),
            
            # Results display
            dbc.Col([
                html.H4("Retirement Plan", className="mb-3"),
                
                # Summary cards
                html.Div(id="retirement-summary-cards", className="mb-4"),
                
                # Chart
                html.Div([
                    dcc.Graph(id="retirement-chart")
                ])
                
            ], width=8)
        ])
    ])


def create_debt_payoff_calculator():
    """Create the debt payoff calculator interface."""
    
    return html.Div([
        dbc.Row([
            # Input controls
            dbc.Col([
                html.H4("Debt Payoff Parameters", className="mb-3"),
                
                # Principal amount
                html.Div([
                    html.Label("Total Debt Amount", className="form-label"),
                    dbc.Input(
                        id="principal-input",
                        type="number",
                        value=20000,
                        min=0,
                        step=100,
                        className="mb-3"
                    )
                ], className="growth-input-field"),
                
                # Annual interest rate
                html.Div([
                    html.Label("Annual Interest Rate (%)", className="form-label"),
                    dbc.Input(
                        id="debt-interest-input",
                        type="number",
                        value=18.0,
                        min=0,
                        max=50,
                        step=0.1,
                        className="mb-3"
                    )
                ], className="growth-input-field"),
                
                # Monthly payment
                html.Div([
                    html.Label("Monthly Payment", className="form-label"),
                    dbc.Input(
                        id="monthly-payment-input",
                        type="number",
                        value=500,
                        min=0,
                        step=10,
                        className="mb-3"
                    )
                ], className="growth-input-field")
                
            ], width=4),
            
            # Results display
            dbc.Col([
                html.H4("Payoff Schedule", className="mb-3"),
                
                # Summary cards
                html.Div(id="debt-summary-cards", className="mb-4"),
                
                # Chart
                html.Div([
                    dcc.Graph(id="debt-chart")
                ])
                
            ], width=8)
        ])
    ])


def create_summary_cards(summary_data, currency_symbol="$"):
    """Create summary cards showing key metrics."""
    
    if not summary_data:
        return html.Div("Enter parameters to see results.")
    
    return dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Final Balance", className="card-title text-primary"),
                    html.H3(format_currency(summary_data['final_balance'], currency_symbol), className="text-primary")
                ])
            ], className="summary-card primary")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Total Contributed", className="card-title text-primary"),
                    html.H3(format_currency(summary_data['total_contributed'], currency_symbol), className="text-primary")
                ])
            ], className="summary-card primary")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Interest Earned", className="card-title text-primary"),
                    html.H3(format_currency(summary_data['total_interest'], currency_symbol), className="text-primary")
                ])
            ], className="summary-card primary")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Effective Return", className="card-title text-primary"),
                    html.H3(f"{summary_data['effective_annual_return']:.2%}", className="text-primary")
                ])
            ], className="summary-card primary")
        ], width=3)
    ], className="g-2")


def create_growth_chart(timeline_data, currency_symbol="$"):
    """Create the growth chart showing balance over time."""
    
    if not timeline_data:
        return {}
    
    fig = go.Figure()
    
    # Add total balance area (shaded)
    fig.add_trace(go.Scatter(
        x=timeline_data['years'],
        y=timeline_data['balance'],
        mode='lines',
        name='Total Balance',
        line=dict(color=COLORS['accent-success'], width=3),
        fill='tozeroy',
        fillcolor=f"rgba({int(COLORS['accent-success'][1:3], 16)}, {int(COLORS['accent-success'][3:5], 16)}, {int(COLORS['accent-success'][5:7], 16)}, 0.2)",
        hovertemplate=f'Year %{{x:.1f}}<br>Balance: {currency_symbol} %{{y:,.2f}}<extra></extra>'
    ))
    
    # Add contributions line (dotted, above the shaded area)
    fig.add_trace(go.Scatter(
        x=timeline_data['years'],
        y=timeline_data['contributions'],
        mode='lines',
        name='Total Contributions',
        line=dict(color=COLORS['accent-primary'], width=2, dash='dot'),
        hovertemplate=f'Year %{{x:.1f}}<br>Contributions: {currency_symbol} %{{y:,.2f}}<extra></extra>'
    ))
    
    # Add interest line (dotted, above the shaded area)
    fig.add_trace(go.Scatter(
        x=timeline_data['years'],
        y=timeline_data['interest'],
        mode='lines',
        name='Interest Earned',
        line=dict(color=COLORS['savings-color'], width=2, dash='dot'),
        hovertemplate=f'Year %{{x:.1f}}<br>Interest: {currency_symbol} %{{y:,.2f}}<extra></extra>'
    ))
    
    fig.update_layout(
        title="Investment Growth Over Time",
        xaxis_title="Years",
        yaxis_title=f"Amount ({currency_symbol})",
        hovermode='x unified',
        template='plotly_white',
        height=500,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        )
    )
    
    # Format y-axis as currency
    fig.update_yaxes(tickformat=f'{currency_symbol},.0f')
    
    return fig


# Callbacks for the compound growth calculator
@callback(
    Output('calculator-content', 'children'),
    Input('calculator-tabs', 'active_tab')
)
def update_calculator_content(active_tab):
    """Update calculator content based on selected tab."""
    
    if active_tab == "compound-growth-tab":
        return create_compound_growth_calculator()
    elif active_tab == "retirement-tab":
        return create_retirement_calculator()
    elif active_tab == "debt-payoff-tab":
        return create_debt_payoff_calculator()
    
    return html.Div("Select a calculator tab.")


@callback(
    [Output('summary-cards', 'children'),
     Output('growth-chart', 'figure')],
    [Input('starting-balance-input', 'value'),
     Input('contribution-input', 'value'),
     Input('frequency-select', 'value'),
     Input('years-input', 'value'),
     Input('return-input', 'value')],
    [State('user-settings-store', 'data')],
    prevent_initial_call=False
)
def update_growth_calculation(starting_balance, contribution, frequency, years, annual_return, user_settings):
    """Calculate and display compound growth results automatically when inputs change."""
    
    # Get currency symbol from user settings or default to $
    currency_symbol = "$"
    if user_settings and user_settings.get('currency'):
        currency_symbol = CURRENCY_SYMBOLS.get(user_settings['currency'], '$')
    
    # Validate inputs - check for None rather than falsy values to allow 0 contributions
    if any(x is None for x in [starting_balance, contribution, frequency, years, annual_return]):
        return html.Div("Enter all parameters to see results."), {}
    
    # Additional validation
    if starting_balance < 0 or contribution < 0 or years <= 0 or annual_return < 0:
        return html.Div("Please enter valid positive values."), {}
    
    try:
        # Convert annual return from percentage to decimal
        annual_return_decimal = annual_return / 100
        
        # Calculate growth
        results = calculate_cumulative_growth(
            starting_balance=float(starting_balance),
            periodic_contribution=float(contribution),
            contribution_frequency=frequency,
            years=int(years),
            annual_return=annual_return_decimal
        )
        
        # Create summary cards
        summary_cards = create_summary_cards(results['summary'], currency_symbol)
        
        # Create chart
        chart = create_growth_chart(results['timeline'], currency_symbol)
        
        return summary_cards, chart
        
    except Exception as e:
        error_msg = html.Div([
            dbc.Alert(f"Error in calculation: {str(e)}", color="danger")
        ])
        return error_msg, {}


# Retirement calculator callback
@callback(
    [Output('retirement-summary-cards', 'children'),
     Output('retirement-chart', 'figure')],
    [Input('target-amount-input', 'value'),
     Input('current-age-input', 'value'),
     Input('retirement-age-input', 'value'),
     Input('current-savings-input', 'value'),
     Input('retirement-return-input', 'value'),
     Input('retirement-frequency-select', 'value')],
    [State('user-settings-store', 'data')],
    prevent_initial_call=False
)
def update_retirement_calculation(target_amount, current_age, retirement_age, current_savings, annual_return, frequency, user_settings):
    """Calculate and display retirement planning results."""
    
    # Get currency symbol
    currency_symbol = "$"
    if user_settings and user_settings.get('currency'):
        currency_symbol = CURRENCY_SYMBOLS.get(user_settings['currency'], '$')
    
    # Validate inputs
    if any(x is None for x in [target_amount, current_age, retirement_age, current_savings, annual_return]):
        return html.Div("Enter all parameters to see results."), {}
    
    # Additional validation
    if (target_amount < 0 or current_age < 0 or retirement_age <= current_age or 
        current_savings < 0 or annual_return < 0):
        return html.Div("Please enter valid values. Retirement age must be greater than current age."), {}
    
    try:
        # Calculate retirement requirements
        results = calculate_retirement_goal(
            target_amount=float(target_amount),
            current_age=int(current_age),
            retirement_age=int(retirement_age),
            current_savings=float(current_savings),
            annual_return=annual_return / 100,
            contribution_frequency=frequency
        )
        
        # Create summary cards
        summary_cards = create_retirement_summary_cards(results, currency_symbol)
        
        # Create projection chart
        chart = create_retirement_chart(results, current_age, retirement_age, current_savings, annual_return / 100, currency_symbol)
        
        return summary_cards, chart
        
    except Exception as e:
        error_msg = html.Div([
            dbc.Alert(f"Error in calculation: {str(e)}", color="danger")
        ])
        return error_msg, {}


# Debt payoff calculator callback
@callback(
    [Output('debt-summary-cards', 'children'),
     Output('debt-chart', 'figure')],
    [Input('principal-input', 'value'),
     Input('debt-interest-input', 'value'),
     Input('monthly-payment-input', 'value')],
    [State('user-settings-store', 'data')],
    prevent_initial_call=False
)
def update_debt_calculation(principal, annual_interest, monthly_payment, user_settings):
    """Calculate and display debt payoff results."""
    
    # Get currency symbol
    currency_symbol = "$"
    if user_settings and user_settings.get('currency'):
        currency_symbol = CURRENCY_SYMBOLS.get(user_settings['currency'], '$')
    
    # Validate inputs
    if any(x is None for x in [principal, annual_interest, monthly_payment]):
        return html.Div("Enter all parameters to see results."), {}
    
    # Additional validation
    if principal < 0 or annual_interest < 0 or monthly_payment <= 0:
        return html.Div("Please enter valid positive values."), {}
    
    try:
        # Calculate debt payoff
        results = calculate_debt_payoff(
            principal=float(principal),
            annual_interest_rate=annual_interest / 100,
            monthly_payment=float(monthly_payment)
        )
        
        # Create summary cards
        summary_cards = create_debt_summary_cards(results['summary'], currency_symbol)
        
        # Create payoff chart
        chart = create_debt_chart(results['schedule'], currency_symbol)
        
        return summary_cards, chart
        
    except Exception as e:
        error_msg = html.Div([
            dbc.Alert(f"Error in calculation: {str(e)}", color="danger")
        ])
        return error_msg, {}


def create_retirement_summary_cards(results, currency_symbol="$"):
    """Create summary cards for retirement calculator."""
    
    # Format the contribution display based on frequency
    frequency_display = results['contribution_frequency'].title()
    contribution_text = f"{format_currency(results['required_contribution'], currency_symbol)} / {frequency_display}"
    
    # Calculate monthly equivalent if not monthly
    if results['contribution_frequency'] == 'quarterly':
        monthly_equivalent = results['required_contribution'] / 3
        contribution_text += f" ({format_currency(monthly_equivalent, currency_symbol)} / Monthly)"
    
    return dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Required Contribution", className="card-title text-primary"),
                    html.H3(contribution_text, className="text-primary", style={"font-size": "1.4rem"})
                ])
            ], className="summary-card primary")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Years to Retirement", className="card-title text-primary"),
                    html.H3(f"{results['years_to_retirement']} years", className="text-primary")
                ])
            ], className="summary-card info")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Future Value Current Savings", className="card-title text-primary"),
                    html.H3(format_currency(results['future_value_current_savings'], currency_symbol), className="text-primary")
                ])
            ], className="summary-card success")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Total New Contributions", className="card-title text-primary"),
                    html.H3(format_currency(results['total_contributions_needed'], currency_symbol), className="text-primary")
                ])
            ], className="summary-card")
        ], width=3)
    ], className="g-2")


def create_debt_summary_cards(summary, currency_symbol="$"):
    """Create summary cards for debt payoff calculator."""
    
    # Calculate what an extra $100/month would save
    try:
        original_principal = summary['original_principal']
        annual_rate = summary['annual_interest_rate']
        higher_payment = summary['monthly_payment'] + 100
        
        # Quick calculation for higher payment scenario
        monthly_rate = annual_rate / 12
        if higher_payment > original_principal * monthly_rate:
            # Calculate months with higher payment
            months_higher = 0
            balance = original_principal
            while balance > 0.01 and months_higher < 600:  # Safety limit
                months_higher += 1
                interest = balance * monthly_rate
                principal_payment = min(higher_payment - interest, balance)
                balance -= principal_payment
            
            months_saved = summary['months_to_payoff'] - months_higher
            suggestion_text = f"+{currency_symbol}100/month saves {months_saved} months" if months_saved > 0 else f"+{currency_symbol}100/month"
        else:
            suggestion_text = f"+{currency_symbol}100/month"
    except:
        suggestion_text = "Consider higher payments"
    
    return dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Time to Pay Off", className="card-title text-primary"),
                    html.H3(f"{summary['months_to_payoff']} months", className="text-primary"),
                    html.P(f"({summary['years_to_payoff']:.1f} years)", className="text-muted")
                ])
            ], className="summary-card primary")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Total Interest Paid", className="card-title text-primary"),
                    html.H3(format_currency(summary['total_interest_paid'], currency_symbol), className="text-primary")
                ])
            ], className="summary-card")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Total Amount Paid", className="card-title text-primary"),
                    html.H3(format_currency(summary['total_amount_paid'], currency_symbol), className="text-primary")
                ])
            ], className="summary-card")
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Payment Suggestion", className="card-title text-primary"),
                    html.H3(suggestion_text, className="text-primary", style={"font-size": "1.2rem"})
                ])
            ], className="summary-card")
        ], width=3)
    ], className="g-2")


def create_retirement_chart(results, current_age, retirement_age, current_savings, annual_return, currency_symbol="$"):
    """Create retirement projection chart."""
    
    years = list(range(current_age, retirement_age + 1))
    years_from_now = [y - current_age for y in years]
    
    # Project current savings growth
    current_savings_growth = [current_savings * ((1 + annual_return) ** y) for y in years_from_now]
    
    # Project with required contributions
    required_contribution = results['required_contribution']
    periods_per_year = 12 if results['contribution_frequency'] == 'monthly' else 4
    period_return = annual_return / periods_per_year
    
    total_with_contributions = []
    for y in years_from_now:
        periods = y * periods_per_year
        if periods == 0:
            total_with_contributions.append(current_savings)
        else:
            # Future value of current savings
            fv_current = current_savings * ((1 + annual_return) ** y)
            # Future value of annuity
            if period_return > 0:
                fv_annuity = required_contribution * (((1 + period_return) ** periods - 1) / period_return)
            else:
                fv_annuity = required_contribution * periods
            total_with_contributions.append(fv_current + fv_annuity)
    
    fig = go.Figure()
    
    # Current savings growth only
    fig.add_trace(go.Scatter(
        x=years,
        y=current_savings_growth,
        mode='lines',
        name='Current Savings Only',
        line=dict(color=COLORS['accent-warning'], width=2, dash='dash'),
        hovertemplate=f'Age %{{x}}<br>Value: {currency_symbol}%{{y:,.0f}}<extra></extra>'
    ))
    
    # Total with contributions
    fig.add_trace(go.Scatter(
        x=years,
        y=total_with_contributions,
        mode='lines',
        name='With Required Contributions',
        line=dict(color=COLORS['accent-success'], width=3),
        fill='tozeroy',
        fillcolor='rgba(16, 185, 129, 0.2)',  # Using hardcoded rgba for accent-success
        hovertemplate=f'Age %{{x}}<br>Value: {currency_symbol}%{{y:,.0f}}<extra></extra>'
    ))
    
    # Target line
    target_amount = results['additional_needed'] + results['future_value_current_savings']
    fig.add_hline(
        y=target_amount,
        line_dash="dot",
        line_color=COLORS['accent-primary'],
        annotation_text="Retirement Goal"
    )
    
    fig.update_layout(
        title="Retirement Savings Projection",
        xaxis_title="Age",
        yaxis_title=f"Savings ({currency_symbol})",
        hovermode='x unified',
        template='plotly_white',
        height=400,
        margin=dict(l=60, r=20, t=60, b=60)
    )
    
    fig.update_yaxes(tickformat=f'{currency_symbol},.0f')
    
    return fig


def create_debt_chart(schedule, currency_symbol="$"):
    """Create debt payoff chart."""
    
    fig = go.Figure()
    
    # Remaining balance area
    fig.add_trace(go.Scatter(
        x=schedule['months'],
        y=schedule['remaining_balance'],
        mode='lines',
        name='Remaining Balance',
        line=dict(color=COLORS['expense-color'], width=3),
        fill='tozeroy',
        fillcolor='rgba(239, 68, 68, 0.2)',  # Using hardcoded rgba for expense-color
        hovertemplate=f'Month %{{x}}<br>Balance: {currency_symbol}%{{y:,.2f}}<extra></extra>'
    ))
    
    # Cumulative interest paid
    cumulative_interest = []
    total_interest = 0
    for interest in schedule['interest_payments']:
        total_interest += interest
        cumulative_interest.append(total_interest)
    
    fig.add_trace(go.Scatter(
        x=schedule['months'],
        y=cumulative_interest,
        mode='lines',
        name='Cumulative Interest Paid',
        line=dict(color=COLORS['accent-warning'], width=2, dash='dot'),
        hovertemplate=f'Month %{{x}}<br>Interest Paid: {currency_symbol}%{{y:,.2f}}<extra></extra>'
    ))
    
    fig.update_layout(
        title="Debt Payoff Progress",
        xaxis_title="Months",
        yaxis_title=f"Amount ({currency_symbol})",
        hovermode='x unified',
        template='plotly_white',
        height=400,
        margin=dict(l=60, r=20, t=60, b=60)
    )
    
    fig.update_yaxes(tickformat=f'{currency_symbol},.0f')
    
    return fig
