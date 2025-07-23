from dash import html, dcc, Input, Output, State, callback
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
from utils.theme import COLORS
from helper.requests.yearly_summary_request import get_yearly_summary
from utils.currency import CURRENCY_SYMBOLS


def create_yearly_view_tab():
    """Create the yearly view tab content"""

    content_style = {
        'backgroundColor': COLORS['background_primary'],
        'padding': '24px',
        'margin': '0',
        'minHeight': '100%',
        'width': '100%'
    }

    return html.Div(
        id='yearly-view-tab-content',
        style=content_style,
        children=[
            html.H2(
                "Yearly Overview",
                style={'color': COLORS['text_primary'], 'marginBottom': '20px'}
            ),
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Income", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            html.H3(id="yearly-income", children="Loading...", style={'color': COLORS['income_color'], 'margin': '0'})
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['income_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Expenses", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            html.H3(id="yearly-expenses", children="Loading...", style={'color': COLORS['expense_color'], 'margin': '0'})
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['expense_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Savings", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            html.H3(id="yearly-savings", children="Loading...", style={'color': COLORS['savings_color'], 'margin': '0'})
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['savings_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Investments", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            html.H3(id="yearly-investments", children="Loading...", style={'color': COLORS['investment_color'], 'margin': '0'})
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['investment_color']}"})
                ], width=3),
            ], className="mb-4"),
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Income vs Expenses", className="mb-0", style={'color': COLORS['text_primary']})
                ]),
                dbc.CardBody([
                    dcc.Graph(id='yearly-income-expense-chart', config={'displayModeBar': False})
                ])
            ], style={'backgroundColor': COLORS['background_secondary']})
        ]
    )


@callback(
    [Output('yearly-income', 'children'),
     Output('yearly-expenses', 'children'),
     Output('yearly-savings', 'children'),
     Output('yearly-investments', 'children'),
     Output('yearly-income-expense-chart', 'figure')],
    [Input('navigation-store', 'data')],
    [State('token-store', 'data'),
     State('user-settings-store', 'data')]
)
def update_yearly_content(nav_data, token_store, user_settings):
    """Update yearly metrics and chart when the yearly tab is active"""
    current_tab = nav_data.get('active_tab', 'overview') if nav_data else 'overview'
    if current_tab != 'yearly_view':
        fig = go.Figure()
        return ("Loading...", "Loading...", "Loading...", "Loading...", fig)

    if not token_store or not token_store.get('access_token'):
        fig = go.Figure()
        return ("No data", "No data", "No data", "No data", fig)

    # Get currency symbol
    currency = (user_settings or {}).get('currency', 'CZK')
    symbol = CURRENCY_SYMBOLS.get(currency, currency)

    try:
        data = get_yearly_summary(token_store['access_token'])
        if not data or 'data' not in data:
            raise ValueError('Invalid data format')
        yearly = data['data']
        months = yearly.get('months', [])
        income = yearly.get('income', [])
        expenses = yearly.get('expenses', [])
        savings = yearly.get('savings', [])
        investments = yearly.get('investments', [])

        def fmt(val):
            return f"{symbol} {val:,.2f}"

        total_income = sum(income)
        total_expenses = sum(expenses)
        total_savings = sum(savings)
        total_investments = sum(investments)

        fig = go.Figure()
        fig.add_trace(go.Bar(x=months, y=income, name='Income', marker_color=COLORS['income_color']))
        fig.add_trace(go.Bar(x=months, y=expenses, name='Expenses', marker_color=COLORS['expense_color']))
        fig.update_layout(
            barmode='group',
            plot_bgcolor=COLORS['background_secondary'],
            paper_bgcolor=COLORS['background_secondary'],
            font={'color': COLORS['text_primary']},
            legend=dict(font=dict(color=COLORS['text_primary']))
        )

        return (
            fmt(total_income),
            fmt(total_expenses),
            fmt(total_savings),
            fmt(total_investments),
            fig
        )
    except Exception as e:
        print(f"Error fetching yearly data: {e}")
        fig = go.Figure()
        return (
            f"Error: {e}",
            f"Error: {e}",
            f"Error: {e}",
            f"Error: {e}",
            fig
        )

