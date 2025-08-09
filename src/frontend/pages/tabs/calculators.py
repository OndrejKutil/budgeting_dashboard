# =============================================================================
# CALCULATORS TAB
# =============================================================================
# Financial calculators including compound growth, retirement planning, and more

from dash import html, dcc, Input, Output, State, callback
import plotly.graph_objects as go
import plotly.express as px
from helper.calc.investment_calculator import calculate_cumulative_growth, format_currency
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
                disabled=True,  # Placeholder
            ),
            dbc.Tab(
                label="Debt Payoff Calculator",
                tab_id="debt-payoff-tab",
                disabled=True,  # Placeholder
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
                        step=500,
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


def create_summary_cards(summary_data, currency_symbol="$"):
    """Create summary cards showing key metrics."""
    
    if not summary_data:
        return html.Div("Enter parameters to see results.")
    
    return dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Final Balance", className="card-title text-success"),
                    html.H3(format_currency(summary_data['final_balance'], currency_symbol), className="text-success")
                ])
            ])
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Total Contributed", className="card-title text-primary"),
                    html.H3(format_currency(summary_data['total_contributed'], currency_symbol), className="text-primary")
                ])
            ])
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Interest Earned", className="card-title text-primary"),
                    html.H3(format_currency(summary_data['total_interest'], currency_symbol), className="text-primary")
                ])
            ])
        ], width=3),
        
        dbc.Col([
            dbc.Card([
                dbc.CardBody([
                    html.H5("Effective Return", className="card-title text-primary"),
                    html.H3(f"{summary_data['effective_annual_return']:.2%}", className="text-primary")
                ])
            ])
        ], width=3)
    ])


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
        return html.Div([
            html.H4("Retirement Calculator"),
            html.P("Coming soon! This calculator will help you plan for retirement.", 
                   className="text-muted")
        ])
    elif active_tab == "debt-payoff-tab":
        return html.Div([
            html.H4("Debt Payoff Calculator"),
            html.P("Coming soon! This calculator will help you plan debt payoff strategies.", 
                   className="text-muted")
        ])
    
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
