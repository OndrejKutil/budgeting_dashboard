# =============================================================================
# NAVIGATION COMPONENT
# =============================================================================
# Modern navigation bar component for dashboard navigation with mobile support

from dash import html, dcc
from utils.tabs import Tab

def create_navigation_bar(active_tab='overview'):
    """Create a modern navigation bar with clickable navigation items and mobile support"""
    
    nav_items = []
    mobile_nav_items = []
    
    for tab in Tab:
        tab_id = tab.name.lower()
        is_active = (tab_id == active_tab)
        
        # Desktop navigation items
        nav_items.append(
            html.Li([
                html.Button(
                    tab.value,
                    id={'type': 'nav-button', 'index': tab_id},
                    className=f"nav-button{' active' if is_active else ''}"
                )
            ], className=None)
        )
        
        # Mobile navigation items
        mobile_nav_items.append(
            html.Button(
                tab.value,
                id={'type': 'mobile-nav-button', 'index': tab_id},
                className=f"nav-button{' active' if is_active else ''}"
            )
        )

    # Add transaction button for desktop
    nav_items.append(
        html.Li([
            html.Button(
                "Add Transaction",
                id="open-add-transaction-button",
                className='nav-button add-transaction-button mr-20'
            )
        ], className='ml-auto')
    )

    # Add logout button for desktop
    nav_items.append(
        html.Li([
            html.Button(
                "Logout",
                id="logout-button",
                className='nav-button'
            )
        ], className=None)
    )
    
    # Add transaction and logout buttons for mobile
    mobile_nav_items.extend([
        html.Button(
            "Add Transaction",
            id="mobile-add-transaction-button",
            className='nav-button add-transaction-button'
        ),
        html.Button(
            "Logout",
            id="mobile-logout-button",
            className='nav-button'
        )
    ])

    return html.Div([
        # Desktop navigation
        html.Nav([
            html.Ul(nav_items, className='nav-list', id='nav-list')
        ], className='navigation-bar'),
        
        # Mobile hamburger menu button
        html.Button([
            html.Span(),
            html.Span(),
            html.Span()
        ], className='hamburger-menu', id='hamburger-menu'),
        
        # Mobile navigation overlay
        html.Div(className='mobile-nav-overlay', id='mobile-nav-overlay'),
        
        # Mobile navigation menu
        html.Div(
            mobile_nav_items,
            className='mobile-nav-menu',
            id='mobile-nav-menu'
        )
    ])
