from dash import html, Input, Output, State, callback, dcc, dash
import dash_bootstrap_components as dbc


def create_budget_tab():
    """Create the budget tab content"""
    
    content = html.Div(
        id='budget-tab-content',
        className='tab-content',
        children=[
            html.H2("Budget Management", className='text-primary mb-4'),
            
            html.P("Welcome to the Budget section of your financial dashboard.", 
                   className="mb-4"),
            
            html.P("This page is currently under development. Here's what we're planning to include:",
                   className="mb-3"),
            
            html.H4("Planned Features:", className="text-primary mb-3"),
            
            html.Ul([
                html.Li("Budget creation and management"),
                html.Li("Category-wise budget allocation"),
                html.Li("Budget vs actual spending analysis"),
                html.Li("Visual progress indicators"),
                html.Li("Budget alerts and notifications"),
                html.Li("Savings goals tracking"),
                html.Li("Expense reduction targets"),
                html.Li("Investment milestones"),
                html.Li("Interactive charts and graphs")
            ], className="mb-4"),
            
            html.Hr(),
            
            html.P("🔧 This budget management system is currently under active development.", 
                   className="text-warning mb-2"),
            html.P("Check back soon for exciting new features!", 
                   className="text-secondary")
        ]
    )

    return content


@callback(
    [Output('budget-tab-content', 'children', allow_duplicate=True)],
    [Input('navigation-store', 'data')],
    [State('token-store', 'data')],
    prevent_initial_call=True
)
def update_budget_content(nav_data, token_store):
    """Update budget tab content when selected"""
    # Only update if budget tab is currently selected
    current_tab = nav_data.get('active_tab', 'overview') if nav_data else 'overview'
    if current_tab != 'budget':
        return [dash.no_update]
    
    # For now, just return the static content
    # In the future, this would fetch and display real budget data
    return [create_budget_tab().children]
