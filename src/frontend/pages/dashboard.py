# =============================================================================
# DASHBOARD PAGE
# =============================================================================
# Main dashboard page that displays user information

from dash import html, dcc, Input, Output, callback
from utils.theme import COLORS
from utils.tabs import Tab
from pages.tabs.overview import create_overview_tab
from pages.tabs.monthly_view import create_monthly_view_tab
from pages.tabs.yearly_view import create_yearly_view_tab
from pages.tabs.transactions import create_transactions_tab
from pages.tabs.profile import create_profile_tab

def create_dashboard_layout():
    """Create the main dashboard layout with tabbed interface"""
    
    # Custom tab styles using theme colors
    tab_style = {
        'backgroundColor': COLORS['background_secondary'],
        'color': COLORS['text_secondary'],
        'border': f"1px solid {COLORS['card_border']}",
        'borderRadius': '8px 8px 0 0',
        'padding': '12px 24px',
        'fontWeight': 'bold',
        'fontSize': '16px',
        'marginRight': '4px',
        'cursor': 'pointer',
        'transition': 'all 0.3s ease'
    }
    
    tab_selected_style = {
        **tab_style,
        'backgroundColor': COLORS['accent_primary'],
        'color': 'white',
        'borderBottom': f"2px solid {COLORS['accent_primary']}"
    }
    
    tabs_container_style = {
        'backgroundColor': COLORS['background_primary'],
        'borderRadius': '0 0 8px 8px',
        'minHeight': '500px',
        'padding': '24px',
        'border': f"1px solid {COLORS['card_border']}",
        'borderTop': 'none',
        'width': '100%',
        'boxSizing': 'border-box'
    }
    
    return html.Div([
        html.Div([
            dcc.Tabs(
                id="dashboard-tabs",
                value="overview",
                children=[
                    dcc.Tab(
                        label=tab.value,
                        value=tab.name.lower(),
                        style=tab_style,
                        selected_style=tab_selected_style
                    ) for tab in Tab
                ],
                style={
                    'marginBottom': '0px',
                    'width': '100%'
                }
            ),
            
            # Tab content container
            html.Div(
                id="tab-content",
                style=tabs_container_style
            )
        ], style={
            'width': '100%',
            'maxWidth': '100%',
            'padding': '0 24px',
            'boxSizing': 'border-box'
        })
    ], style={
        'backgroundColor': COLORS['background_primary'],
        'minHeight': '100vh',
        'fontFamily': 'Whitney, "Helvetica Neue", Helvetica, Arial, sans-serif',
        'color': COLORS['text_primary'],
        'padding': '24px 0',
        'width': '100%',
        'overflowX': 'hidden'
    })


@callback(
    Output('tab-content', 'children'),
    Input('dashboard-tabs', 'value')
)
def update_tab_content(selected_tab):
    """Update the content based on selected tab"""
    
    if selected_tab == Tab.OVERVIEW.name.lower():
        return create_overview_tab()
    
    elif selected_tab == Tab.MONTHLY_VIEW.name.lower():
        return create_monthly_view_tab()

    elif selected_tab == Tab.YEARLY_VIEW.name.lower():
        return create_yearly_view_tab()
    
    elif selected_tab == Tab.TRANSACTIONS.name.lower():
        return create_transactions_tab()
    
    elif selected_tab == Tab.PROFILE.name.lower():
        return create_profile_tab()
        
    
    # Default fallback
    return html.Div("Select a tab to view content")