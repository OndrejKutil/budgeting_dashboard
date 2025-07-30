# =============================================================================
# NAVIGATION COMPONENT
# =============================================================================
# Modern navigation bar component for dashboard navigation with mobile support

from dash import html, dcc, Input, Output, State, callback, callback_context
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
        # Store for mobile menu state
        dcc.Store(id='mobile-menu-store', data={'open': False}),
        
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

# =============================================================================
# MOBILE NAVIGATION CALLBACKS
# =============================================================================

@callback(
    [Output('mobile-menu-store', 'data'),
     Output('hamburger-menu', 'className'),
     Output('mobile-nav-menu', 'className'),
     Output('mobile-nav-overlay', 'className')],
    [Input('hamburger-menu', 'n_clicks'),
     Input('mobile-nav-overlay', 'n_clicks'),
     Input({'type': 'mobile-nav-button', 'index': 'overview'}, 'n_clicks'),
     Input({'type': 'mobile-nav-button', 'index': 'transactions'}, 'n_clicks'),
     Input({'type': 'mobile-nav-button', 'index': 'accounts'}, 'n_clicks'),
     Input({'type': 'mobile-nav-button', 'index': 'yearly_view'}, 'n_clicks'),
     Input({'type': 'mobile-nav-button', 'index': 'profile'}, 'n_clicks'),
     Input('mobile-add-transaction-button', 'n_clicks'),
     Input('mobile-logout-button', 'n_clicks')],
    [State('mobile-menu-store', 'data')],
    prevent_initial_call=True
)
def toggle_mobile_menu(hamburger_clicks, overlay_clicks, overview_clicks, transactions_clicks, 
                      accounts_clicks, yearly_clicks, profile_clicks, add_trans_clicks, 
                      logout_clicks, current_state):
    """Toggle mobile navigation menu open/closed"""
    
    if not current_state:
        current_state = {'open': False}
    
    ctx = callback_context
    if not ctx.triggered:
        return current_state, 'hamburger-menu', 'mobile-nav-menu', 'mobile-nav-overlay'
    
    trigger_id = ctx.triggered[0]['prop_id'].split('.')[0]
    
    # If hamburger or overlay clicked, toggle menu
    if trigger_id in ['hamburger-menu', 'mobile-nav-overlay']:
        new_state = {'open': not current_state['open']}
    else:
        # If any navigation button clicked, close menu
        new_state = {'open': False}
    
    # Set CSS classes based on menu state
    if new_state['open']:
        hamburger_class = 'hamburger-menu active'
        menu_class = 'mobile-nav-menu active'
        overlay_class = 'mobile-nav-overlay active'
    else:
        hamburger_class = 'hamburger-menu'
        menu_class = 'mobile-nav-menu'
        overlay_class = 'mobile-nav-overlay'
    
    return new_state, hamburger_class, menu_class, overlay_class
