# =============================================================================
# NAVIGATION COMPONENT
# =============================================================================
# Modern navigation bar component for dashboard navigation

from dash import html, dcc
from utils.tabs import Tab
from utils.theme import (
    NAVIGATION_BAR_STYLE, 
    NAV_LIST_STYLE, 
    NAV_BUTTON_STYLE,
    NAV_BUTTON_ACTIVE_STYLE,
    LOGOUT_BUTTON_STYLE
)

def create_navigation_bar(active_tab='overview'):
    """Create a modern navigation bar with clickable navigation items"""
    
    nav_items = []
    for tab in Tab:
        tab_id = tab.name.lower()
        
        nav_items.append(
            html.Li([
                html.Button(
                    tab.value,
                    id={'type': 'nav-button', 'index': tab_id},
                    style=NAV_BUTTON_STYLE,
                    className='nav-button'
                )
            ], style={'margin': '0'})
        )
    
    return html.Nav([
        html.Ul(nav_items, style=NAV_LIST_STYLE, id='nav-list')
    ], style=NAVIGATION_BAR_STYLE)


def create_logout_button():
    """Create logout button for the navigation bar"""
    return html.Div([
        html.Button(
            "Logout",
            id="logout-button",
            style=LOGOUT_BUTTON_STYLE,
            className='logout-button'
        )
    ], style={
        'marginLeft': 'auto',
        'display': 'flex',
        'alignItems': 'center'
    })
