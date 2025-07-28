from dash import html, dcc, Input, Output, State, callback
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
from utils.theme import COLORS, LOADING_STYLE
from helper.requests.yearly_analytics_request import get_yearly_analytics, get_emergency_fund_analysis
from utils.currency import CURRENCY_SYMBOLS
import datetime


def create_yearly_view_tab():
    """Create the yearly view tab content with comprehensive analytics"""

    content_style = {
        'backgroundColor': COLORS['background_primary'],
        'padding': '24px',
        'margin': '0',
        'minHeight': '100%',
        'width': '100%'
    }

    current_year = datetime.datetime.now().year
    year_options = [{"label": str(year), "value": year} for year in range(current_year - 5, current_year + 2)]

    content = html.Div(
        id='yearly-view-tab-content',
        style=content_style,
        children=[
            # Header with year selector
            html.Div([
                html.H2(
                    "Yearly Financial Analytics",
                    style={'color': COLORS['text_primary'], 'margin': '0', 'flex': '1'}
                ),
                html.Div([
                    html.Label("Select Year:", style={'color': COLORS['text_primary'], 'marginRight': '10px'}),
                    dcc.Dropdown(
                        id='yearly-year-selector',
                        options=year_options,
                        value=current_year,
                        clearable=False,
                        style={'width': '120px', 'display': 'inline-block'}
                    )
                ], style={'display': 'flex', 'alignItems': 'center'})
            ], style={
                'display': 'flex',
                'justifyContent': 'space-between',
                'alignItems': 'center',
                'marginBottom': '24px'
            }),
            
            # Store for yearly data
            dcc.Store(id='yearly-analytics-store'),
            dcc.Store(id='emergency-fund-store'),
            
            # Key Metrics Cards Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Income", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="yearly-total-income", children='', style={'color': COLORS['income_color'], 'margin': '0'}),
                                style={**LOADING_STYLE, 'marginTop': '-1.5rem'}
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['income_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Expenses", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="yearly-total-expenses", children='', style={'color': COLORS['expense_color'], 'margin': '0'}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['expense_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Savings", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="yearly-total-savings", children='', style={'color': COLORS['savings_color'], 'margin': '0'}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['savings_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Investments", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="yearly-total-investments", children='', style={'color': COLORS['investment_color'], 'margin': '0'}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['investment_color']}"})
                ], width=3),
            ], className="mb-4"),
            
            # Secondary Metrics Cards Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Profit/Loss", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="yearly-profit", children='', style={'margin': '0'}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], id="yearly-profit-card", style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['accent_primary']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Net Cash Flow", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="yearly-net-flow", children='', style={'margin': '0'}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], id="yearly-net-flow-card", style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['accent_primary']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Savings Rate", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="yearly-savings-rate", children='', style={'color': COLORS['savings_color'], 'margin': '0'}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['savings_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Investment Rate", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="yearly-investment-rate", children='', style={'color': COLORS['investment_color'], 'margin': '0'}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['investment_color']}"})
                ], width=3),
            ], className="mb-4"),
            
            # Charts Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Monthly Income vs Expenses", className="mb-0", style={'color': COLORS['text_primary']})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-income-expense-chart', config={'displayModeBar': False}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary']})
                ], width=6),
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Core vs Fun Expenses", className="mb-0", style={'color': COLORS['text_primary']})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-expense-breakdown-chart', config={'displayModeBar': False}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary']})
                ], width=6),
            ], className="mb-4"),
            
            # Savings & Investment Analysis Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Monthly Savings & Investments", className="mb-0", style={'color': COLORS['text_primary']})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-savings-investment-chart', config={'displayModeBar': False}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary']})
                ], width=6),
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Monthly Saving & Investing ratios", className="mb-0", style={'color': COLORS['text_primary']})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-saving-investing-ratios-chart', config={'displayModeBar': False}),
                                style=LOADING_STYLE
                            )
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary']})
                ], width=6),
            ], className="mb-4"),
            
            # Emergency Fund Analysis
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Emergency Fund Analysis", className="mb-0", style={'color': COLORS['text_primary']})
                ]),
                dbc.CardBody([
                    dcc.Loading([
                        dbc.Row([
                            dbc.Col([
                                html.H5("3-Month Emergency Fund", style={'color': COLORS['text_primary']}),
                                html.Div(id="emergency-fund-3-month", style={'marginBottom': '20px'})
                            ], width=6),
                            dbc.Col([
                                html.H5("6-Month Emergency Fund", style={'color': COLORS['text_primary']}),
                                html.Div(id="emergency-fund-6-month", style={'marginBottom': '20px'})
                            ], width=6),
                        ]),
                        dbc.Row([
                            dbc.Col([
                                html.H5("Core Expenses Breakdown", style={'color': COLORS['text_primary'], 'marginTop': '20px'}),
                                html.Div(id="core-expenses-breakdown")
                            ], width=12)
                        ])
                    ], style=LOADING_STYLE)
                ])
            ], style={'backgroundColor': COLORS['background_secondary']})
        ]
    )

    return content


@callback(
    [Output('yearly-analytics-store', 'data'),
     Output('emergency-fund-store', 'data')],
    [Input('yearly-year-selector', 'value'),
     Input('navigation-store', 'data')],
    State('token-store', 'data')
)
def fetch_yearly_data(selected_year, nav_data, token_store):
    """Fetch yearly analytics and emergency fund data when year changes or tab is selected"""
    current_tab = nav_data.get('active_tab', 'overview') if nav_data else 'overview'
    if current_tab != 'yearly_view':
        return {}, {}
    
    if not token_store or not token_store.get('access_token'):
        return {}, {}
    
    try:
        analytics_data = get_yearly_analytics(token_store['access_token'], selected_year)
        emergency_data = get_emergency_fund_analysis(token_store['access_token'], selected_year)
        return analytics_data, emergency_data
    except Exception as e:
        print(f"Error fetching yearly data: {e}")
        return {}, {}


@callback(
    [Output('yearly-total-income', 'children'),
     Output('yearly-total-expenses', 'children'),
     Output('yearly-total-savings', 'children'),
     Output('yearly-total-investments', 'children'),
     Output('yearly-profit', 'children'),
     Output('yearly-savings-rate', 'children'),
     Output('yearly-investment-rate', 'children'),
     Output('yearly-net-flow', 'children')],
    Input('yearly-analytics-store', 'data'),
    State('user-settings-store', 'data')
)
def update_yearly_metrics(analytics_data, user_settings):
    """Update yearly metrics cards"""
    if not analytics_data or 'data' not in analytics_data:
        # Always return a string or placeholder, never no_update or None
        return (
            "No data", "No data", "No data", "No data", "No data", "No data", "No data", "No data"
        )
    
    # Get currency symbol
    currency = (user_settings or {}).get('currency', 'CZK')
    symbol = CURRENCY_SYMBOLS.get(currency, currency)
    
    data = analytics_data['data']
    
    def fmt(val):
        return f"{symbol} {val:,.2f}"
    
    def fmt_percent(val):
        return f"{val:.1f}%"
    
    # Get values
    income = data.get('total_income', 0)
    expenses = data.get('total_expense', 0)
    savings = data.get('total_saving', 0)
    investments = data.get('total_investment', 0)
    profit = data.get('profit', 0)
    net_flow = data.get('net_cash_flow', 0)
    savings_rate = data.get('savings_rate', 0)
    investment_rate = data.get('investment_rate', 0)

    return (
        fmt(income),
        fmt(expenses),
        fmt(savings),
        fmt(investments),
        fmt(profit),
        fmt_percent(savings_rate),
        fmt_percent(investment_rate),
        fmt(net_flow)
    )


@callback(
    Output('yearly-income-expense-chart', 'figure'),
    Input('yearly-analytics-store', 'data')
)
def update_income_expense_chart(analytics_data):
    """Update monthly income vs expenses chart"""
    if not analytics_data or 'data' not in analytics_data:
        return go.Figure()
    
    data = analytics_data['data']
    months = data.get('months', [])
    income = data.get('monthly_income', [])
    expenses = data.get('monthly_expense', [])
    
    fig = go.Figure()
    fig.add_trace(go.Bar(x=months, y=income, name='Income', marker_color=COLORS['income_color']))
    fig.add_trace(go.Bar(x=months, y=expenses, name='Expenses', marker_color=COLORS['expense_color']))
    
    fig.update_layout(
        barmode='group',
        plot_bgcolor=COLORS['background_secondary'],
        paper_bgcolor=COLORS['background_secondary'],
        font={'color': COLORS['text_primary']},
        legend=dict(font=dict(color=COLORS['text_primary'])),
        margin=dict(l=40, r=40, t=40, b=40)
    )
    
    return fig


@callback(
    Output('yearly-expense-breakdown-chart', 'figure'),
    Input('yearly-analytics-store', 'data')
)
def update_expense_breakdown_chart(analytics_data):
    """Update core vs fun expenses chart"""
    if not analytics_data or 'data' not in analytics_data:
        return go.Figure()

    data = analytics_data['data']
    months = data.get('months', [])
    core_expenses = data.get('monthly_core_expense', [])
    fun_expenses = data.get('monthly_fun_expense', [])
    future_expenses = data.get('monthly_future_expense', [])

    fig = go.Figure()
    fig.add_trace(go.Bar(x=months, y=core_expenses, name='Core Expenses', marker_color=COLORS['expense_color']))
    fig.add_trace(go.Bar(x=months, y=fun_expenses, name='Fun Expenses', marker_color=COLORS['accent_warning']))
    fig.add_trace(go.Bar(x=months, y=future_expenses, name='Future Expenses', marker_color=COLORS['accent_success']))

    fig.update_layout(
        barmode='stack',
        plot_bgcolor=COLORS['background_secondary'],
        paper_bgcolor=COLORS['background_secondary'],
        font={'color': COLORS['text_primary']},
        legend=dict(font=dict(color=COLORS['text_primary'])),
        margin=dict(l=40, r=40, t=40, b=40)
    )
    
    return fig


@callback(
    Output('yearly-savings-investment-chart', 'figure'),
    Input('yearly-analytics-store', 'data')
)
def update_savings_investment_chart(analytics_data):
    """Update monthly savings and investments chart"""
    if not analytics_data or 'data' not in analytics_data:
        return go.Figure()
    
    data = analytics_data['data']
    months = data.get('months', [])
    savings = data.get('monthly_saving', [])
    investments = data.get('monthly_investment', [])
    
    fig = go.Figure()
    fig.add_trace(go.Bar(x=months, y=savings, name='Savings', marker_color=COLORS['savings_color']))
    fig.add_trace(go.Bar(x=months, y=investments, name='Investments', marker_color=COLORS['investment_color']))
    
    fig.update_layout(
        barmode='group',
        plot_bgcolor=COLORS['background_secondary'],
        paper_bgcolor=COLORS['background_secondary'],
        font={'color': COLORS['text_primary']},
        legend=dict(font=dict(color=COLORS['text_primary'])),
        margin=dict(l=40, r=40, t=40, b=40)
    )
    
    return fig


@callback(
    Output('yearly-saving-investing-ratios-chart', 'figure'),
    Input('yearly-analytics-store', 'data')
)
def update_savings_investment_ratios_chart(analytics_data):
    """Update monthly savings and investments ratios chart"""
    if not analytics_data or 'data' not in analytics_data:
        return go.Figure()

    data = analytics_data['data']
    months = data.get('months', [])
    savings_rate = data.get('monthly_savings_rate', [])
    investment_rate = data.get('monthly_investment_rate', [])

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=months, y=savings_rate, mode='lines', name='Savings Rate', line=dict(color=COLORS['savings_color'], width=2)))
    fig.add_trace(go.Scatter(x=months, y=investment_rate, mode='lines', name='Investment Rate', line=dict(color=COLORS['investment_color'], width=2)))

    fig.add_trace(go.Scatter(x=months, y=[20] * len(months), mode='lines', name='Target Savings Rate (20%)', line=dict(color=COLORS['text_secondary'], width=2, dash='dot')))
    fig.add_trace(go.Scatter(x=months, y=[10] * len(months), mode='lines', name='Target Investment Rate (10%)', line=dict(color=COLORS['text_secondary'], width=2, dash='dot')))

    fig.update_layout(
        plot_bgcolor=COLORS['background_secondary'],
        paper_bgcolor=COLORS['background_secondary'],
        font={'color': COLORS['text_primary']},
        legend=dict(font=dict(color=COLORS['text_primary'])),
        margin=dict(l=40, r=40, t=40, b=40)
    )

    return fig


@callback(
    [Output('emergency-fund-3-month', 'children'),
     Output('emergency-fund-6-month', 'children'),
     Output('core-expenses-breakdown', 'children')],
    Input('emergency-fund-store', 'data'),
    State('user-settings-store', 'data')
)
def update_emergency_fund_analysis(emergency_data, user_settings):
    """Update emergency fund analysis section"""
    if not emergency_data or 'data' not in emergency_data:
        # Always return a string or placeholder, never no_update or None
        return (
            html.P("No data", style={'color': COLORS['text_secondary']}),
            html.P("No data", style={'color': COLORS['text_secondary']}),
            html.P("No data", style={'color': COLORS['text_secondary']})
        )
    
    # Get currency symbol
    currency = (user_settings or {}).get('currency', 'CZK')
    symbol = CURRENCY_SYMBOLS.get(currency, currency)
    
    data = emergency_data['data']
    
    def fmt(val):
        return f"{symbol} {val:,.2f}"
    
    # 3-month fund analysis
    three_month_target = data.get('three_month_fund_target', 0)
    
    three_month_content = html.Div([
        html.P(f"Target: {fmt(three_month_target)}", style={'color': COLORS['text_primary'], 'margin': '5px 0'}),
        ])
    
    # 6-month fund analysis
    six_month_target = data.get('six_month_fund_target', 0)
    
    six_month_content = html.Div([
        html.P(f"Target: {fmt(six_month_target)}", style={'color': COLORS['text_primary'], 'margin': '5px 0'}),
    ])
    
    # Core expenses breakdown
    core_categories = data.get('core_category_breakdown', {})
    avg_monthly = data.get('average_monthly_core_expenses', 0)
    
    if core_categories:
        breakdown_items = []
        for category, amount in sorted(core_categories.items(), key=lambda x: x[1], reverse=True):
            percentage = (amount / (avg_monthly * 12) * 100) if avg_monthly > 0 else 0
            breakdown_items.append(
                html.Div([
                    html.Span(category, style={'color': COLORS['text_primary']}),
                    html.Span(f"{fmt(amount)} ({percentage:.1f}%)", 
                             style={'color': COLORS['text_secondary'], 'float': 'right'})
                ], style={'margin': '5px 0', 'padding': '5px', 'backgroundColor': COLORS['background_tertiary'], 'borderRadius': '4px'})
            )
        
        breakdown_content = html.Div([
            html.P(f"Average Monthly Core Expenses: {fmt(avg_monthly)}", 
                  style={'color': COLORS['text_primary'], 'fontWeight': 'bold', 'marginBottom': '15px'}),
            html.Div(breakdown_items)
        ])
    else:
        breakdown_content = html.P("No core expense data available", style={'color': COLORS['text_secondary']})
    
    return three_month_content, six_month_content, breakdown_content