# =============================================================================
# SAVINGS TAB
# =============================================================================
# Savings management tab with charts, fund amounts, and savings funds table

from dash import html, dcc
import dash_bootstrap_components as dbc


def create_savings_tab():
    """Create the savings tab with fund analytics and savings funds management."""
    
    return html.Div([
        html.H2("Savings", className="page-title"),
        
        # Savings tabs
        dbc.Tabs([
            dbc.Tab(
                label="Charts & Analytics",
                tab_id="savings-charts-tab",
            ),
            dbc.Tab(
                label="Savings Funds",
                tab_id="savings-funds-tab",
            )
        ], id="savings-tabs", active_tab="savings-charts-tab"),
        
        html.Div(id="savings-content", className="mt-4")
    ], className="tab-content")


def create_savings_charts_content():
    """Create the savings charts and analytics content."""
    
    return html.Div([
        html.H3("Charts & Fund Amounts", style={"color": "red", "text-align": "center", "margin": "50px 0"}),
        html.P("TODO: page for charts and fund amounts", 
               style={"color": "red", "text-align": "center", "font-size": "18px"})
    ], className="placeholder-content")


def create_savings_funds_content():
    """Create the savings funds table and management content."""
    
    return html.Div([
        html.H3("Savings Funds Management", style={"color": "red", "text-align": "center", "margin": "50px 0"}),
        html.P("TODO: Savings funds table with add/edit functionality", 
               style={"color": "red", "text-align": "center", "font-size": "18px"})
    ], className="placeholder-content")


# Callback to handle savings tab content switching
from dash import Input, Output, callback

@callback(
    Output("savings-content", "children"),
    Input("savings-tabs", "active_tab")
)
def render_savings_tab_content(active_tab):
    """Render content based on the selected savings tab."""
    
    if active_tab == "savings-charts-tab":
        return create_savings_charts_content()
    elif active_tab == "savings-funds-tab":
        return create_savings_funds_content()
    
    # Default fallback
    return create_savings_charts_content()
