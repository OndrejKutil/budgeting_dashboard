from dash import html, Input, Output, State, callback, dash_table, dcc
import dash_bootstrap_components as dbc
from utils.theme import COLORS
from helper.requests.overview_request import get_overview
from utils.currency import CURRENCY_SYMBOLS



def create_overview_tab():
    """Create the overview tab content"""
    
    content = html.Div(
        id='overview-tab-content',
        className='tab-content',
        children=[
            html.H2("Financial Overview", className='tab-heading'),
            
            # Key Metrics Cards Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Income", className="card-title card-title-sm"),
                            dcc.Loading(
                                html.H3(id="overview-income", children='', className="income-color no-margin"),
                                className="loading loading-offset"
                            )
                        ])
                    ], className='card border-income')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Expenses", className="card-title card-title-sm"),
                            dcc.Loading(
                                html.H3(id="overview-expenses", children='', className="expense-color no-margin"),
                                className="loading loading-offset"
                            )
                        ])
                    ], className='card border-expense')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Savings", className="card-title card-title-sm"),
                            dcc.Loading(
                                html.H3(id="overview-savings", children='', className="savings-color no-margin"),
                                className="loading loading-offset"
                            )
                        ])
                    ], className='card border-savings')
                ], width=3),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Investments", className="card-title card-title-sm"),
                            dcc.Loading(
                                html.H3(id="overview-investments", children='', className="investment-color no-margin"),
                                className="loading loading-offset"
                            )
                        ])
                    ], className='card border-investment')
                ], width=3),
            ], className="mb-4"),
            
            # Secondary Metrics Cards Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Profit/Loss", className="card-title card-title-sm"),
                            dcc.Loading(
                                html.H3(id="overview-profit", children='', className="no-margin"),
                                className="loading loading-offset"
                            )
                        ])
                    ], id="profit-card", className='card border-accent')
                ], width=6),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Cash Flow", className="card-title card-title-sm"),
                            dcc.Loading(
                                html.H3(id="overview-cashflow", children='', className="no-margin"),
                                className="loading loading-offset"
                            )
                        ])
                    ], id="cashflow-card", className='card border-accent')
                ], width=6),
            ], className="mb-4"),
            
            # Category Breakdown Table
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Category Breakdown", className="mb-0 text-primary")
                ]),
                dbc.CardBody([
                    html.Div(id="overview-category-table", children='')
                ])
            ], className='card')
        ]
    )

    return content


@callback(
    [Output('overview-income', 'children'),
     Output('overview-expenses', 'children'),
     Output('overview-savings', 'children'),
     Output('overview-investments', 'children'),
     Output('overview-profit', 'children'),
     Output('overview-cashflow', 'children'),
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
            '', '', '', '', '', '', ''
        )
    
    if not token_store or not token_store.get('access_token'):
        return (
            "No data", "No data", "No data", "No data", "No data", "No data", "No data available"
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
            category_table = html.P("No category data available", className='text-secondary')
        
        return (
            format_currency(income),      # income
            format_currency(expenses),    # expenses
            format_currency(savings),     # savings
            format_currency(investments), # investments
            format_currency(profit),      # profit        # profit card style
            format_currency(cashflow),    # cashflow        # cashflow card style
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