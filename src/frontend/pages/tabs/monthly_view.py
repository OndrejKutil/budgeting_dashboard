from dash import html, dcc, Input, Output, State, callback, dash
import dash_bootstrap_components as dbc
import plotly.graph_objects as go
import plotly.express as px
import calendar

from helper.requests.monthly_analytics_request import get_monthly_analytics
from utils.currency import CURRENCY_SYMBOLS
from utils.colors import COLORS
import datetime


def create_monthly_view_tab():
    """Create the monthly view tab content with comprehensive monthly analytics"""

    current_year = datetime.datetime.now().year
    current_month = datetime.datetime.now().month
    
    year_options = [{"label": str(year), "value": year} for year in range(current_year - 5, current_year + 2)]
    month_options = [{"label": calendar.month_name[i], "value": i} for i in range(1, 13)]

    content = html.Div(
        id='monthly-view-tab-content',
        className='tab-content monthly-view',
        children=[
            # Header with month and year selector
            html.Div([
                html.H2(
                    "Monthly Financial Analytics",
                    className='text-primary',
                    style={'margin': '0', 'flex': '1'}
                ),
                html.Div([
                    html.Label("Month:", className='text-primary month-selector-label'),
                    dcc.Dropdown(
                        id='monthly-month-selector',
                        options=month_options,
                        value=current_month,
                        clearable=False,
                        className='month-selector-dropdown'
                    ),
                    html.Label("Year:", className='text-primary year-selector-label'),
                    dcc.Dropdown(
                        id='monthly-year-selector',
                        options=year_options,
                        value=current_year,
                        clearable=False,
                        className='year-selector-dropdown'
                    )
                ], className='month-year-selector-container')
            ], className='flex-between mb-24'),
            
            # Key Metrics Cards Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Total Income", className="card-title text-primary"),
                            dcc.Loading(
                                html.H3(id="monthly-total-income", children='', className='income-color', style={'margin': '0'}),
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
                                html.H3(id="monthly-total-expenses", children='', className='expense-color', style={'margin': '0'}),
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
                                html.H3(id="monthly-total-savings", children='', className='savings-color', style={'margin': '0'}),
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
                                html.H3(id="monthly-total-investments", children='', className='investment-color', style={'margin': '0'}),
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
                                html.H3(id="monthly-profit", children='', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], id="monthly-profit-card", className='border-primary')
                ], width=6),
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.H4("Net Cash Flow", className='card-title text-primary'),
                            dcc.Loading(
                                html.H3(id="monthly-cashflow", children='', style={'margin': '0'}),
                                className='loading loading-negative'
                            )
                        ])
                    ], id="monthly-cashflow-card", className='border-primary')
                ], width=6),
            ], className="mb-4"),
            
            # Daily Spending Heatmap
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Daily Spending Heatmap", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='monthly-daily-heatmap', config={'displayModeBar': False}),
                                className='loading loading-negative daily-heatmap-container'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=12),
            ], className="mb-4"),
            
            # Category and Spending Type Breakdown Row
            dbc.Row([
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Category Breakdown", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='monthly-category-breakdown', config={'displayModeBar': False}),
                                className='loading loading-negative category-breakdown-container'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=8),
                dbc.Col([
                    dbc.Card([
                        dbc.CardHeader([
                            html.H4("Spending Types", className="mb-0", style={'color': 'var(--text-primary)'})
                        ]),
                        dbc.CardBody([
                            dcc.Loading(
                                dcc.Graph(id='monthly-spending-types', config={'displayModeBar': False}),
                                className='loading loading-negative spending-type-container'
                            )
                        ])
                    ], style={'backgroundColor': 'var(--background-secondary)'})
                ], width=4),
            ], className="mb-4"),
        ]
    )

    return content


# ================================================================================================
#                                   Callback Functions
# ================================================================================================

@callback(
    [
        Output('monthly-total-income', 'children'),
        Output('monthly-total-expenses', 'children'),
        Output('monthly-total-savings', 'children'),
        Output('monthly-total-investments', 'children'),
        Output('monthly-profit', 'children'),
        Output('monthly-cashflow', 'children'),
        Output('monthly-profit-card', 'className'),
        Output('monthly-cashflow-card', 'className'),
        Output('monthly-daily-heatmap', 'figure'),
        Output('monthly-category-breakdown', 'figure'),
        Output('monthly-spending-types', 'figure'),
        Output('token-store', 'data', allow_duplicate=True),
    ],
    [
        Input('monthly-year-selector', 'value'),
        Input('monthly-month-selector', 'value'),
        Input('navigation-store', 'data'),
    ],
    [
        State('token-store', 'data'),
        State('user-settings-store', 'data')
    ],
    prevent_initial_call=True
)
def update_monthly_analytics(year, month, navigation_data, token_data, user_settings):
    """Update all monthly analytics displays when year or month changes"""
    
    # Only update if monthly view tab is currently selected
    current_tab = navigation_data.get('active_tab', 'overview') if navigation_data else 'overview'
    if current_tab != 'monthly_view':
        empty_fig = go.Figure()
        empty_fig.update_layout(
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            xaxis={'showgrid': False, 'zeroline': False},
            yaxis={'showgrid': False, 'zeroline': False}
        )
        return ('', '', '', '', '', '', 'border-primary', 'border-primary', empty_fig, empty_fig, empty_fig, dash.no_update)
    
    if not token_data or not token_data.get('access_token') or not token_data.get('refresh_token'):
        empty_fig = go.Figure()
        empty_fig.update_layout(
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            xaxis={'showgrid': False, 'zeroline': False},
            yaxis={'showgrid': False, 'zeroline': False}
        )
        return ('', '', '', '', '', '', 'border-primary', 'border-primary', empty_fig, empty_fig, empty_fig, dash.no_update)
    
    try:
        # Use the new API client with token refresh capability
        response, new_access_token, new_refresh_token = get_monthly_analytics(
            token_data['access_token'], 
            token_data['refresh_token'],
            year, 
            month
        )
        
        # Update token store if tokens were refreshed
        updated_token_store = token_data.copy()
        if new_access_token != token_data['access_token'] or new_refresh_token != token_data['refresh_token']:
            updated_token_store['access_token'] = new_access_token
            updated_token_store['refresh_token'] = new_refresh_token
            print("Tokens refreshed during monthly analytics request")
        else:
            updated_token_store = dash.no_update
        
        data = response.get('data', {})
        
        # Format currency values
        currency_symbol = CURRENCY_SYMBOLS.get((user_settings or {}).get('currency', 'USD'), '$')
        
        income_text = f"{currency_symbol} {data.get('income', 0):,.2f}"
        expenses_text = f"{currency_symbol} {data.get('expenses', 0):,.2f}"
        savings_text = f"{currency_symbol} {data.get('savings', 0):,.2f}"
        investments_text = f"{currency_symbol} {data.get('investments', 0):,.2f}"
        
        profit = data.get('profit', 0)
        cashflow = data.get('cashflow', 0)
        
        profit_text = f"{currency_symbol} {profit:,.2f}"
        cashflow_text = f"{currency_symbol} {cashflow:,.2f}"

        # Use static border-primary class like yearly page
        profit_class = 'border-primary'
        cashflow_class = 'border-primary'
        
        # Create daily spending heatmap
        daily_heatmap_fig = create_daily_heatmap(data.get('daily_spending_heatmap', []), year, month)
        
        # Create category breakdown chart
        category_breakdown_fig = create_category_breakdown_chart(data.get('category_breakdown', []))
        
        # Create spending types chart
        spending_types_fig = create_spending_types_chart(data.get('spending_type_breakdown', []))
        
        return (
            income_text, expenses_text, savings_text, investments_text,
            profit_text, cashflow_text, profit_class, cashflow_class,
            daily_heatmap_fig, category_breakdown_fig, spending_types_fig,
            updated_token_store
        )
        
    except Exception as e:
        print(f"Error fetching monthly analytics data: {e}")
        empty_fig = go.Figure()
        empty_fig.update_layout(
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)'
        )
        return ('Error', 'Error', 'Error', 'Error', 'Error', 'Error', 'border-danger', 'border-danger', empty_fig, empty_fig, empty_fig, dash.no_update)


def create_daily_heatmap(daily_data, year, month):
    """Create a calendar heatmap for daily spending"""
    
    if not daily_data:
        fig = go.Figure()
        fig.update_layout(
            title="No spending data available",
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            height=400,
            title_font_color=COLORS.get('text-primary', '#1e293b')
        )
        return fig
    
    # Create calendar grid
    import calendar as cal
    from datetime import date
    
    # Get the calendar for the month
    cal_month = cal.monthcalendar(year, month)
    
    # Create data dictionary for easy lookup
    spending_dict = {item['day']: item['amount'] for item in daily_data}
    
    # Create heatmap data
    z_data = []
    text_data = []
    
    for week in reversed(cal_month):
        week_z = []
        week_text = []
        for day in week:
            if day == 0:  # Empty cell
                week_z.append(None)
                week_text.append('')
            else:
                day_str = f"{year}-{month:02d}-{day:02d}"
                amount = spending_dict.get(day_str, 0)
                week_z.append(amount)
                week_text.append(f"Day {day}<br>${amount:.2f}")
        z_data.append(week_z)
        text_data.append(week_text)
    
    # Create day labels for x-axis
    day_labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    fig = go.Figure(data=go.Heatmap(
        z=z_data,
        text=text_data,
        texttemplate="%{text}",
        textfont={"size": 10},
        colorscale='Reds',
        showscale=True,
        hoverongaps=False,
        colorbar=dict(
            tickfont=dict(color=COLORS.get('text-primary', '#1e293b'))
        )
    ))
    
    fig.update_layout(
        title=f"Daily Spending for {calendar.month_name[month]} {year}",
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        height=400,
        xaxis={
            'tickvals': list(range(7)),
            'ticktext': day_labels,
            'showgrid': False, 
            'zeroline': False,
            'showline': False,
            'side': 'top',
            'tickfont': dict(color=COLORS.get('text-primary', '#1e293b'))
        },
        yaxis={
            'showticklabels': False, 
            'showgrid': False, 
            'zeroline': False,
            'showline': False
        },
        title_font_color=COLORS.get('text-primary', '#1e293b')
    )
    
    return fig


def create_category_breakdown_chart(category_data):
    """Create a horizontal bar chart for category breakdown"""
    
    if not category_data:
        fig = go.Figure()
        fig.update_layout(
            title="No category data available",
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            height=350,
            title_font_color=COLORS.get('text-primary', '#1e293b')
        )
        return fig
    
    # Sort by amount (highest first)
    sorted_data = sorted(category_data, key=lambda x: x['total'], reverse=True)
    
    categories = [item['category'] for item in sorted_data]
    amounts = [item['total'] for item in sorted_data]
    
    fig = go.Figure(data=[
        go.Bar(
            y=categories,
            x=amounts,
            orientation='h',
            marker_color=COLORS.get('accent-primary', '#3498db'),
            text=[f"${amount:,.2f}" for amount in amounts],
            textposition='auto'
        )
    ])
    
    fig.update_layout(
        title="Spending by Category",
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        height=350,
        xaxis_title="Amount ($)",
        yaxis={
            'categoryorder': 'total ascending',
            'tickfont': dict(color=COLORS.get('text-primary', '#1e293b'))
        },
        xaxis={
            'tickfont': dict(color=COLORS.get('text-primary', '#1e293b')),
            'titlefont': dict(color=COLORS.get('text-primary', '#1e293b'))
        },
        margin=dict(l=120, r=20, t=40, b=40),
        title_font_color=COLORS.get('text-primary', '#1e293b')
    )
    
    return fig


def create_spending_types_chart(spending_types_data):
    """Create a donut chart for spending types breakdown"""
    
    if not spending_types_data:
        fig = go.Figure()
        fig.update_layout(
            title="No spending type data available",
            template='plotly_dark',
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            height=350,
            title_font_color=COLORS.get('text-primary', '#1e293b')
        )
        return fig
    
    labels = [item['type'] for item in spending_types_data]
    values = [item['amount'] for item in spending_types_data]
    
    # Define colors for spending types
    colors = {
        'Core': COLORS.get('expense-color', '#e74c3c'),
        'Fun': COLORS.get('accent-primary', '#3498db'),
        'Future': COLORS.get('savings-color', '#2ecc71')
    }
    
    pie_colors = [colors.get(label, '#95a5a6') for label in labels]
    
    fig = go.Figure(data=[
        go.Pie(
            labels=labels,
            values=values,
            hole=0.4,
            marker_colors=pie_colors,
            textinfo='label+percent',
            textfont_size=12
        )
    ])
    
    fig.update_layout(
        title="Spending Types Distribution",
        template='plotly_dark',
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        height=350,
        showlegend=False,
        margin=dict(t=40, b=20, l=20, r=20),
        title_font_color=COLORS.get('text-primary', '#1e293b')
    )
    
    return fig
