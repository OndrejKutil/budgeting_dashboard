# =============================================================================
# DASHBOARD PAGE
# =============================================================================
# Main dashboard page that displays user information

from dash import html, dcc, Input, Output, callback, ALL, State, callback_context
from utils.theme import COLORS, NAV_BUTTON_STYLE, NAV_BUTTON_ACTIVE_STYLE, LOGOUT_BUTTON_STYLE
from utils.tabs import Tab
from components.navigation import create_navigation_bar, create_logout_button
from pages.tabs.overview import create_overview_tab
from pages.tabs.monthly_view import create_monthly_view_tab
from pages.tabs.yearly_view import create_yearly_view_tab
from pages.tabs.transactions import create_transactions_tab
from pages.tabs.profile import create_profile_tab

def create_dashboard_layout():
    """Create the main dashboard layout with navigation bar interface"""
    
    # Content container style - full width and height, no borders
    content_container_style = {
        'backgroundColor': COLORS['background_primary'],
        'minHeight': 'calc(100vh - 60px)',  # Full height minus navbar
        'padding': '0',
        'margin': '0',
        'width': '100%',
        'boxSizing': 'border-box'
    }
    
    return html.Div([
        # Navigation bar with logout button
        html.Div([
            create_navigation_bar(),
            create_logout_button()
        ], style={
            'display': 'flex',
            'alignItems': 'center',
            'backgroundColor': COLORS['background_secondary'],
            'padding': '0 24px',
            'height': '60px'
        }),
        
        # Content area
        html.Div(
            id="nav-content",
            style=content_container_style
        )
        
    ], style={
        'backgroundColor': COLORS['background_primary'],
        'minHeight': '100vh',
        'fontFamily': 'Whitney, "Helvetica Neue", Helvetica, Arial, sans-serif',
        'color': COLORS['text_primary'],
        'width': '100%',
        'overflowX': 'hidden'
    })


@callback(
    Output('nav-content', 'children'),
    Output('navigation-store', 'data'),
    Input({'type': 'nav-button', 'index': ALL}, 'n_clicks'),
    Input('navigation-store', 'data'),
    State('navigation-store', 'data'),
    prevent_initial_call=False
)
def update_navigation_content(n_clicks_list, nav_data_input, nav_data_state):
    """Update the content and navigation state based on clicked navigation button"""
    
    # Find which button was clicked
    ctx = callback_context
    if not ctx.triggered:
        # Initial load, return default content
        return get_tab_content('overview'), {'active_tab': 'overview'}
    
    trigger_id = ctx.triggered[0]['prop_id']
    
    # Check if a navigation button was clicked
    if 'nav-button' in trigger_id:
        button_id = ctx.triggered[0]['prop_id'].split('.')[0]
        button_index = eval(button_id)['index']  # Extract the tab index
        
        # Update navigation state
        new_nav_data = {'active_tab': button_index}
        return get_tab_content(button_index), new_nav_data
    
    # Otherwise, just update content based on current navigation state
    active_tab = nav_data_input.get('active_tab', 'overview') if nav_data_input else 'overview'
    return get_tab_content(active_tab), nav_data_input or {'active_tab': 'overview'}


@callback(
    Output({'type': 'nav-button', 'index': ALL}, 'style'),
    Input('navigation-store', 'data')
)
def update_navigation_button_styles(nav_data):
    """Update navigation button styles based on active tab"""
    active_tab = nav_data.get('active_tab', 'overview')
    
    styles = []
    for tab in Tab:
        tab_id = tab.name.lower()
        if tab_id == active_tab:
            styles.append(NAV_BUTTON_ACTIVE_STYLE)
        else:
            styles.append(NAV_BUTTON_STYLE)
    
    return styles


def get_tab_content(selected_tab):
    """Get the content for the selected tab"""
    
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