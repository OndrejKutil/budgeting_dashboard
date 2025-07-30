# =============================================================================
# NAVIGATION COMPONENT
# =============================================================================
# Modern navigation bar component for dashboard navigation

from dash import html, dcc
from utils.tabs import Tab

def create_navigation_bar(active_tab='overview'):
    """Create a modern navigation bar with clickable navigation items"""
    
    nav_items = []
    for tab in Tab:
        tab_id = tab.name.lower()
        is_active = (tab_id == active_tab)
        nav_items.append(
            html.Li([
                html.Button(
                    tab.value,
                    id={'type': 'nav-button', 'index': tab_id},
                    className=f"nav-button{' active' if is_active else ''}"
                )
            ], className=None)
        )

    nav_items.append(
        html.Li([
            html.Button(
                "Add Transaction",
                id="open-add-transaction-button",
                className='nav-button add-transaction-button mr-20'
            )
        ], className='ml-auto')
    )

    # Add logout button as last item
    nav_items.append(
        html.Li([
            html.Button(
                "Logout",
                id="logout-button",
                className='btn-danger'
            )
        ], className=None)
    )

    return html.Nav([
        html.Ul(nav_items, className='nav-list', id='nav-list')
    ], className='navigation-bar')
