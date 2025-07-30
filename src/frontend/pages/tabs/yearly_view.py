from dash import html, dcc, Input, Output, State, callback
import dash_bootstrap_components as dbc
import plotly.graph_objects as go

from helper.requests.yearly_analytics_request import get_yearly_analytics, get_emergency_fund_analysis
from utils.currency import CURRENCY_SYMBOLS
from utils.colors import COLORS
import datetime


def create_yearly_view_tab():
    """Create the yearly view tab content with comprehensive analytics"""

    current_year = datetime.datetime.now().year
    year_options = [{"label": str(year), "value": year} for year in range(current_year - 5, current_year + 2)]

    content = html.Div(
        id='yearly-view-tab-content',
        className='tab-content',
        children=[
            # Header with year selector
            html.Div([
                html.H2(
                    "Yearly Financial Analytics",
                    className='text-primary',
                    style={'margin': '0', 'flex': '1'}
                ),
                html.Div([
                    html.Label("Select Year:", className='text-primary', style={'marginRight': '10px'}),
                    dcc.Dropdown(
                        id='yearly-year-selector',
                        options=year_options,
                        value=current_year,
                        clearable=False,
                        style={'width': '120px', 'display': 'inline-block'}
                    )
                ], className='align-center')
            ], className='flex-between mb-24'),
            
            # Key Metrics Cards Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Income", className="card-title text-primary"),
                            dcc.Loading(
                                html.H3(id="yearly-total-income", children='', className='income-color', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], className='border-income')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Expenses", className="card-title text-primary"),
                            dcc.Loading(
                                html.H3(id="yearly-total-expenses", children='', className='expense-color', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], className='border-expense')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Savings", className='card-title text-primary'),
                            dcc.Loading(
                                html.H3(id="yearly-total-savings", children='', className='savings-color', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], className='border-savings')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Investments", className='card-title text-primary'),
                            dcc.Loading(
                                html.H3(id="yearly-total-investments", children='', className='investment-color', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], className='border-investment')
                ], width=3),
            ], className="mb-4"),
            
            # Secondary Metrics Cards Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Profit/Loss", className='card-title text-primary'),
                            dcc.Loading(
                                html.H3(id="yearly-profit", children='', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], id="yearly-profit-card", className='border-primary')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Net Cash Flow", className='card-title text-primary'),
                            dcc.Loading(
                                html.H3(id="yearly-net-flow", children='', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], id="yearly-net-flow-card", className='border-primary')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Savings Rate", className='card-title text-primary'),
                            dcc.Loading(
                                html.H3(id="yearly-savings-rate", children='', className='savings-color', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], className='border-savings')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Investment Rate", className='card-title text-primary'),
                            dcc.Loading(
                                html.H3(id="yearly-investment-rate", children='', className='investment-color', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], className='border-investment')
                ], width=3),
            ], className="mb-4"),
            
            # Charts Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Monthly Income vs Expenses", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-income-expense-chart', config={'displayModeBar': False}),
                                className='loading loading-negative'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=6),
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Core vs Fun Expenses", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-expense-breakdown-chart', config={'displayModeBar': False}),
                                className='loading loading-negative'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=6),
            ], className="mb-4"),
            
            # Income analysis and expenses pie chart
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Monthly Income Categories Breakdown", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-income-categories-breakdown-pie-chart', config={'displayModeBar': False}),
                                className='loading loading-negative'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=6),
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Expenses Breakdown", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-expenses-breakdown-pie-chart', config={'displayModeBar': False}),
                                className='loading loading-negative'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=6),
            ], className="mb-4"),

            # Savings & Investment Analysis Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Monthly Savings & Investments", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-savings-investment-chart', config={'displayModeBar': False}),
                                className='loading loading-negative'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=6),
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Monthly Saving & Investing ratios", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='yearly-saving-investing-ratios-chart', config={'displayModeBar': False}),
                                className='loading loading-negative'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=6),
            ], className="mb-4"),
            
            # Emergency Fund Analysis
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Emergency Fund Analysis", className="mb-0", style={'color': 'var(--text-primary)'})
                ]),
                dbc.CardBody([
                    dcc.Loading([
                        dbc.Row([
                            dbc.Col([
                                html.H5("3-Month Emergency Fund", style={'color': 'var(--text-primary)'}),
                                html.Div(id="emergency-fund-3-month", style={'marginBottom': '20px'})
                            ], width=6),
                            dbc.Col([
                                html.H5("6-Month Emergency Fund", style={'color': 'var(--text-primary)'}),
                                html.Div(id="emergency-fund-6-month", style={'marginBottom': '20px'})
                            ], width=6),
                        ]),
                        dbc.Row([
                            dbc.Col([
                                html.H5("Core Expenses Breakdown", style={'color': 'var(--text-primary)', 'marginTop': '20px'}),
                                html.Div(id="core-expenses-breakdown")
                            ], width=12)
                        ])
                    ], className='loading loading-negative')
                ])
            ], style={'backgroundColor': 'var(--background-secondary)'})
        ]
    )

    return content


@callback(
    [Output('yearly-total-income', 'children'),
     Output('yearly-total-expenses', 'children'),
     Output('yearly-total-savings', 'children'),
     Output('yearly-total-investments', 'children'),
     Output('yearly-profit', 'children'),
     Output('yearly-savings-rate', 'children'),
     Output('yearly-investment-rate', 'children'),
     Output('yearly-net-flow', 'children'),
     Output('yearly-income-expense-chart', 'figure'),
     Output('yearly-expense-breakdown-chart', 'figure'),
     Output('yearly-income-categories-breakdown-pie-chart', 'figure'),
     Output('yearly-expenses-breakdown-pie-chart', 'figure'),
     Output('yearly-savings-investment-chart', 'figure'),
     Output('yearly-saving-investing-ratios-chart', 'figure'),
     Output('emergency-fund-3-month', 'children'),
     Output('emergency-fund-6-month', 'children'),
     Output('core-expenses-breakdown', 'children')],
    [Input('yearly-year-selector', 'value'),
     Input('navigation-store', 'data')],
    [State('token-store', 'data'),
     State('user-settings-store', 'data')]
)
def update_yearly_content(selected_year, nav_data, token_store, user_settings):
    """Update all yearly content in a single callback to show loading spinners"""
    # Only update if yearly view tab is currently selected
    current_tab = nav_data.get('active_tab', 'overview') if nav_data else 'overview'
    if current_tab != 'yearly_view':
        return (
            '', '', '', '', '', '', '', '',  # metrics
            go.Figure(), go.Figure(), go.Figure(), go.Figure(), go.Figure(), go.Figure(),  # charts
            '', '', ''  # emergency fund
        )
    
    if not token_store or not token_store.get('access_token'):
        return (
            "No data", "No data", "No data", "No data", "No data", "No data", "No data", "No data",
            go.Figure(), go.Figure(), go.Figure(), go.Figure(), go.Figure(), go.Figure(),
            "No data available", "No data available", "No data available"
        )
    
    # Get currency symbol
    currency = (user_settings or {}).get('currency', 'CZK')
    symbol = CURRENCY_SYMBOLS.get(currency, currency)
    
    def fmt(val):
        return f"{symbol} {val:,.2f}"
    
    def fmt_percent(val):
        return f"{val:.1f}%"
    
    try:
        # Fetch both analytics and emergency fund data
        analytics_data = get_yearly_analytics(token_store['access_token'], selected_year)
        emergency_data = get_emergency_fund_analysis(token_store['access_token'], selected_year)
        
        if not analytics_data or 'data' not in analytics_data:
            raise ValueError("Invalid analytics data format")
            
        data = analytics_data['data']
        
        # === METRICS CALCULATIONS ===
        income = data.get('total_income', 0)
        expenses = data.get('total_expense', 0)
        savings = data.get('total_saving', 0)
        investments = data.get('total_investment', 0)
        profit = data.get('profit', 0)
        net_flow = data.get('net_cash_flow', 0)
        savings_rate = data.get('savings_rate', 0)
        investment_rate = data.get('investment_rate', 0)
        
        # Format metrics
        metrics = (
            fmt(income),
            fmt(expenses),
            fmt(savings),
            fmt(investments),
            fmt(profit),
            fmt_percent(savings_rate),
            fmt_percent(investment_rate),
            fmt(net_flow)
        )
        
        # === CHART CREATION ===
        months = data.get('months', [])
        
        # Income vs Expenses Chart
        income_expense_fig = go.Figure()
        income_expense_fig.add_trace(go.Bar(
            x=months, 
            y=data.get('monthly_income', []), 
            name='Income', 
            marker_color=COLORS['income-color']
        ))
        income_expense_fig.add_trace(go.Bar(
            x=months, 
            y=data.get('monthly_expense', []), 
            name='Expenses', 
            marker_color=COLORS['expense-color']
        ))
        income_expense_fig.update_layout(
            barmode='group',
            plot_bgcolor=COLORS['background-secondary'],
            paper_bgcolor=COLORS['background-secondary'],
            font={'color': COLORS['text-primary']},
            legend=dict(font=dict(color=COLORS['text-primary'])),
            margin=dict(l=40, r=40, t=40, b=40),
            yaxis=dict(
            showgrid=True,
            gridcolor=COLORS.get('background-tertiary'),
            gridwidth=1,
            zeroline=True,
            zerolinecolor=COLORS.get('background-tertiary'),
            zerolinewidth=1,
            ),
        )
        
        # Expense Breakdown Chart
        expense_breakdown_fig = go.Figure()
        expense_breakdown_fig.add_trace(go.Bar(
            x=months, 
            y=data.get('monthly_core_expense', []), 
            name='Core Expenses', 
            marker_color=COLORS['expense-color']
        ))
        expense_breakdown_fig.add_trace(go.Bar(
            x=months, 
            y=data.get('monthly_fun_expense', []), 
            name='Fun Expenses', 
            marker_color=COLORS['accent-warning']
        ))
        expense_breakdown_fig.add_trace(go.Bar(
            x=months, 
            y=data.get('monthly_future_expense', []), 
            name='Future Expenses', 
            marker_color=COLORS['accent-success']
        ))
        expense_breakdown_fig.update_layout(
            barmode='stack',
            plot_bgcolor=COLORS['background-secondary'],
            paper_bgcolor=COLORS['background-secondary'],
            font={'color': COLORS['text-primary']},
            legend=dict(font=dict(color=COLORS['text-primary'])),
            margin=dict(l=40, r=40, t=40, b=40),
            yaxis=dict(
            showgrid=True,
            gridcolor=COLORS.get('background-tertiary'),
            gridwidth=1,
            zeroline=True,
            zerolinecolor=COLORS.get('background-tertiary'),
            zerolinewidth=1,
            ),
        )

        expense_by_category_pie_chart = go.Figure()
        expense_by_category_pie_chart.add_trace(go.Pie(
            labels=list(data.get('expense_by_category', {}).keys()),
            values=list(data.get('expense_by_category', {}).values()),
        ))

        income_by_category_pie_chart = go.Figure()
        income_by_category_pie_chart.add_trace(go.Pie(
            labels=list(data.get('income_by_category', {}).keys()),
            values=list(data.get('income_by_category', {}).values()),
        ))

        # Savings & Investment Chart
        savings_investment_fig = go.Figure()
        savings_investment_fig.add_trace(go.Bar(
            x=months, 
            y=data.get('monthly_saving', []), 
            name='Savings', 
            marker_color=COLORS['savings-color']
        ))
        savings_investment_fig.add_trace(go.Bar(
            x=months, 
            y=data.get('monthly_investment', []), 
            name='Investments', 
            marker_color=COLORS['investment-color']
        ))
        savings_investment_fig.update_layout(
            barmode='group',
            plot_bgcolor=COLORS['background-secondary'],
            paper_bgcolor=COLORS['background-secondary'],
            font={'color': COLORS['text-primary']},
            legend=dict(font=dict(color=COLORS['text-primary'])),
            margin=dict(l=40, r=40, t=40, b=40),
            yaxis=dict(
            showgrid=True,
            gridcolor=COLORS.get('background-tertiary'),
            gridwidth=1,
            zeroline=True,
            zerolinecolor=COLORS.get('background-tertiary'),
            zerolinewidth=1,
            ),
        )
        
        # Savings & Investment Ratios Chart
        ratios_fig = go.Figure()
        ratios_fig.add_trace(go.Scatter(
            x=months, 
            y=data.get('monthly_savings_rate', []), 
            mode='lines', 
            name='Savings Rate', 
            line=dict(color=COLORS['savings-color'], width=2)
        ))
        ratios_fig.add_trace(go.Scatter(
            x=months, 
            y=data.get('monthly_investment_rate', []), 
            mode='lines', 
            name='Investment Rate', 
            line=dict(color=COLORS['investment-color'], width=2)
        ))
        ratios_fig.add_trace(go.Scatter(
            x=months, 
            y=[20] * len(months), 
            mode='lines', 
            name='Target Savings Rate (20%)', 
            line=dict(color=COLORS['savings-color'], width=2, dash='dot')
        ))
        ratios_fig.add_trace(go.Scatter(
            x=months, 
            y=[10] * len(months), 
            mode='lines', 
            name='Target Investment Rate (10%)', 
            line=dict(color=COLORS['investment-color'], width=2, dash='dot')
        ))
        ratios_fig.update_layout(
            plot_bgcolor=COLORS['background-secondary'],
            paper_bgcolor=COLORS['background-secondary'],
            font={'color': COLORS['text-primary']},
            legend=dict(font=dict(color=COLORS['text-primary'])),
            margin=dict(l=40, r=40, t=40, b=40),
            yaxis=dict(
            showgrid=True,
            gridcolor=COLORS.get('background-tertiary'),
            gridwidth=1,
            zeroline=True,
            zerolinecolor=COLORS.get('background-tertiary'),
            zerolinewidth=1,
            ),
        )
        
        # === EMERGENCY FUND ANALYSIS ===
        if emergency_data and 'data' in emergency_data:
            emergency_info = emergency_data['data']
            
            # 3-month fund analysis
            three_month_target = emergency_info.get('three_month_fund_target', 0)
            three_month_content = html.Div([
                html.P(f"Target: {fmt(three_month_target)}", 
                      style={'color': 'var(--text-primary)', 'margin': '5px 0'}),
            ])
            
            # 6-month fund analysis
            six_month_target = emergency_info.get('six_month_fund_target', 0)
            six_month_content = html.Div([
                html.P(f"Target: {fmt(six_month_target)}", 
                      style={'color': 'var(--text-primary)', 'margin': '5px 0'}),
            ])
            
            # Core expenses breakdown
            core_categories = emergency_info.get('core_category_breakdown', {})
            avg_monthly = emergency_info.get('average_monthly_core_expenses', 0)
            
            if core_categories:
                breakdown_items = []
                for category, amount in sorted(core_categories.items(), key=lambda x: x[1], reverse=True):
                    percentage = (amount / (avg_monthly * 12) * 100) if avg_monthly > 0 else 0
                    breakdown_items.append(
                        html.Div([
                            html.Span(category, style={'color': 'var(--text-primary)'}),
                            html.Span(f"{fmt(amount)} ({percentage:.1f}%)", 
                                     style={'color': 'var(--text-secondary)', 'float': 'right'})
                        ], style={'margin': '5px 0', 'padding': '5px', 'backgroundColor': 'var(--background-tertiary)', 'borderRadius': '4px'})
                    )
                
                breakdown_content = html.Div([
                    html.P(f"Average Monthly Core Expenses: {fmt(avg_monthly)}", 
                          style={'color': 'var(--text-primary)', 'fontWeight': 'bold', 'marginBottom': '15px'}),
                    html.Div(breakdown_items)
                ])
            else:
                breakdown_content = html.P("No core expense data available", style={'color': 'var(--text-secondary)'})
        else:
            three_month_content = html.P("No data", style={'color': 'var(--text-secondary)'})
            six_month_content = html.P("No data", style={'color': 'var(--text-secondary)'})
            breakdown_content = html.P("No data", style={'color': 'var(--text-secondary)'})
        
        emergency_fund_data = (three_month_content, six_month_content, breakdown_content)

        return metrics + (income_expense_fig, expense_breakdown_fig, income_by_category_pie_chart, expense_by_category_pie_chart, savings_investment_fig, ratios_fig) + emergency_fund_data

    except Exception as e:
        print(f"Error fetching yearly data: {e}")
        error_msg = f"Error: {str(e)}"
        return (
            "Error", "Error", "Error", "Error", "Error", "Error", "Error", "Error",
            go.Figure(), go.Figure(), go.Figure(), go.Figure(), go.Figure(), go.Figure(),
            "Error loading data", "Error loading data", "Error loading data"
        )