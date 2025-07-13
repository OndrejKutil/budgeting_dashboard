# =============================================================================
# MAIN DASH APPLICATION
# =============================================================================
# Main application file that sets up the Dash app with routing and authentication

import dash
from dash import html, dcc, Input, Output, callback
import dash_bootstrap_components as dbc

# Import our custom theme
from utils.theme import APP_STYLE
# Import pages
from pages.login import create_login_layout
from pages.dashboard import create_dashboard_layout
# Import helper functions
from helper.auth_helpers import is_user_authenticated

# =============================================================================
# APP INITIALIZATION
# =============================================================================

# Initialize the Dash app with Bootstrap theme
app = dash.Dash(
    __name__, 
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    suppress_callback_exceptions=True
)

# Set app title
app.title = "Budget Dashboard"

# =============================================================================
# MAIN APP LAYOUT
# =============================================================================

app.layout = html.Div([
    
    # Store authentication data
    dcc.Store(
        id='auth-store',
        data={
            'logged': False,
            'email': '',
            'access_token': '',
            'refresh_token': '',
            'user': None,
            'session': None
        }
    ),
    
    # Main content area
    html.Div(id='main-content')
    
], style=APP_STYLE)

# =============================================================================
# MAIN ROUTING CALLBACK
# =============================================================================

@app.callback(
    Output('main-content', 'children'),
    Input('auth-store', 'data')
)
def display_page(auth_data):
    """Display the appropriate page based on authentication status"""
    if is_user_authenticated(auth_data):
        # User is authenticated, show dashboard
        return create_dashboard_layout()
    else:
        # User is not authenticated, show login page
        return create_login_layout()

# =============================================================================
# LOGOUT CALLBACK
# =============================================================================

@app.callback(
    Output('auth-store', 'data', allow_duplicate=True),
    Input('logout-button', 'n_clicks'),
    prevent_initial_call=True
)
def handle_logout(n_clicks):
    """Handle logout button click"""
    if n_clicks:
        # Reset auth store to logged out state
        return {
            'logged': False,
            'email': '',
            'access_token': '',
            'refresh_token': '',
            'user': None,
            'session': None
        }
    return dash.no_update

# =============================================================================
# RUN THE APPLICATION
# =============================================================================

if __name__ == "__main__":
    # Run the app in debug mode for development
    app.run(debug=True, host="127.0.0.1", port=8050)