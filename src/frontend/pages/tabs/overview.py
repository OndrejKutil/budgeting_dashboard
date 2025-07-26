from dash import html, Input, Output, State, callback, dash_table, dcc
import dash_bootstrap_components as dbc
from utils.theme import COLORS, LOADING_STYLE
from helper.requests.overview_request import get_overview
from utils.currency import CURRENCY_SYMBOLS



def create_overview_tab():
    """Create the overview tab content"""
    
    content_style = {
        'backgroundColor': COLORS['background_primary'],
        'padding': '24px',
        'margin': '0',
        'minHeight': '100%',
        'width': '100%'
    }
    
    content = html.Div(
        id='overview-tab-content',
        style=content_style,
        children=[
            html.H2("Financial Overview", style={
                'color': COLORS['text_primary'],
                'marginBottom': '20px'
            }),
            
            # Key Metrics Cards Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Income", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="overview-income", children='', style={'color': COLORS['income_color'], 'margin': '0'})
                            , style={**LOADING_STYLE, 'marginTop': '-1.5rem'})
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['income_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Expenses", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="overview-expenses", children='', style={'color': COLORS['expense_color'], 'margin': '0'})
                            , style={**LOADING_STYLE, 'marginTop': '-1.5rem'})
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['expense_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Savings", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="overview-savings", children='', style={'color': COLORS['savings_color'], 'margin': '0'})
                            , style={**LOADING_STYLE, 'marginTop': '-1.5rem'})
                        ])
                    ], style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['savings_color']}"})
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Investments", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="overview-investments", children='', style={'color': COLORS['investment_color'], 'margin': '0'})
                            , style={**LOADING_STYLE, 'marginTop': '-1.5rem'})
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
                                html.H3(id="overview-profit", children='', style={'margin': '0'}),
                                style={**LOADING_STYLE, 'marginTop': '-1.5rem'}
                            )
                        ])
                    ], id="profit-card", style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['neutral_color']}"})
                ], width=6),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Cash Flow", className="card-title", style={'color': COLORS['text_primary'], 'fontSize': '16px'}),
                            dcc.Loading(
                                html.H3(id="overview-cashflow", children='', style={'margin': '0'}),
                                style={**LOADING_STYLE, 'marginTop': '-1.5rem'}
                            )
                        ])
                    ], id="cashflow-card", style={'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['neutral_color']}"})
                ], width=6),
            ], className="mb-4"),
            
            # Category Breakdown Table
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Category Breakdown", className="mb-0", style={'color': COLORS['text_primary']})
                ]),
                dbc.CardBody([
                    html.Div(id="overview-category-table", children='')
                ])
            ], style={'backgroundColor': COLORS['background_secondary']})
        ]
    )

    return content


@callback(
    [Output('overview-income', 'children'),
     Output('overview-expenses', 'children'),
     Output('overview-savings', 'children'),
     Output('overview-investments', 'children'),
     Output('overview-profit', 'children'),
     Output('overview-profit', 'style'),
     Output('profit-card', 'style'),
     Output('overview-cashflow', 'children'),
     Output('overview-cashflow', 'style'),
     Output('cashflow-card', 'style'),
     Output('overview-category-table', 'children')],
    [Input('navigation-store', 'data')],
    [State('token-store', 'data'), 
     State('user-settings-store', 'data')]
)
def update_overview_content(nav_data, token_store, user_settings):
    # Only update if overview tab is currently selected
    current_tab = nav_data.get('active_tab', 'overview') if nav_data else 'overview'
    if current_tab != 'overview':
        return (
            '', '', '', '', '', {'margin': '0'}, 
            {'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['neutral_color']}"},
            '', {'margin': '0'},
            {'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['neutral_color']}"},
            ''
        )
    
    if not token_store or not token_store.get('access_token'):
        return (
            "No data", "No data", "No data", "No data", "No data", {'margin': '0'}, 
            {'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['neutral_color']}"},
            "No data", {'margin': '0'},
            {'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['neutral_color']}"},
            "No data available"
        )
    
    # Get selected currency and symbol
    currency = (user_settings or {}).get('currency', 'CZK')
    symbol = CURRENCY_SYMBOLS.get(currency, currency)

    try:
        data = get_overview(token_store['access_token'])
        if not data or 'data' not in data:
            raise ValueError("Invalid data format")
        overview_data = data['data']
        
        # Format currency values
        def format_currency(value):
            if value is None:
                return f"{symbol} 0.00"
            return f"{symbol} {value:,.2f}"
        
        # Get values with defaults
        income = overview_data.get('total_income', 0)
        expenses = overview_data.get('total_expense', 0)
        profit = overview_data.get('profit', 0)
        cashflow = overview_data.get('net_cash_flow', 0)
        savings = overview_data.get('total_saving', 0)
        investments = overview_data.get('total_investment', 0)
        by_category = overview_data.get('by_category', {})
        
        # Style for profit/loss
        profit_color = COLORS['income_color'] if profit >= 0 else COLORS['expense_color']
        profit_border_color = COLORS['income_color'] if profit >= 0 else COLORS['expense_color']
        profit_style = {'color': profit_color, 'margin': '0'}
        profit_card_style = {'backgroundColor': COLORS['background_secondary'], 'border': f'1px solid {profit_border_color}'}
        
        # Style for cash flow
        cashflow_color = COLORS['income_color'] if cashflow >= 0 else COLORS['expense_color']
        cashflow_border_color = COLORS['income_color'] if cashflow >= 0 else COLORS['expense_color']
        cashflow_style = {'color': cashflow_color, 'margin': '0'}
        cashflow_card_style = {'backgroundColor': COLORS['background_secondary'], 'border': f'1px solid {cashflow_border_color}'}
        
        # Create category breakdown table
        if by_category:
            category_data = []
            for category, amount in by_category.items():
                category_data.append({
                    'Category': category,
                    'Amount': format_currency(amount),
                    'Type': 'Income' if amount > 0 else 'Expense'
                })
            
            category_table = dash_table.DataTable(
                data=category_data,
                columns=[
                    {'name': 'Category', 'id': 'Category'},
                    {'name': 'Amount', 'id': 'Amount'},
                    {'name': 'Type', 'id': 'Type'}
                ],
                style_cell={
                    'textAlign': 'left',
                    'backgroundColor': COLORS['background_secondary'],
                    'color': COLORS['text_primary'],
                    'border': f'1px solid {COLORS["text_secondary"]}',
                    'padding': '10px'
                },
                style_header={
                    'backgroundColor': COLORS['text_secondary'],
                    'color': COLORS['background_primary'],
                    'fontWeight': 'bold'
                },
                style_data_conditional=[
                    {
                        'if': {'column_id': 'Amount', 'filter_query': '{Type} = Income'},
                        'color': COLORS['income_color']
                    },
                    {
                        'if': {'column_id': 'Amount', 'filter_query': '{Type} = Expense'},
                        'color': COLORS['expense_color']
                    }
                ]
            )
        else:
            category_table = html.P("No category data available", style={'color': COLORS['text_secondary']})
        
        return (
            format_currency(income),      # income
            format_currency(expenses),    # expenses
            format_currency(savings),     # savings
            format_currency(investments), # investments
            format_currency(profit),      # profit
            profit_style,                 # profit style
            profit_card_style,           # profit card style
            format_currency(cashflow),    # cashflow
            cashflow_style,              # cashflow style
            cashflow_card_style,         # cashflow card style
            category_table               # category table
        )
        
    except Exception as e:
        print(f"Error fetching overview data: {e}")
        error_msg = f"Error: {str(e)}"
        return (
            "Error", "Error", "Error", "Error", "Error", {'margin': '0'},
            {'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['accent_danger']}"},
            "Error", {'margin': '0'},
            {'backgroundColor': COLORS['background_secondary'], 'border': f"1px solid {COLORS['accent_danger']}"},
            "Error"
        )