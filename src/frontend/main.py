import dash
from dash import html, dcc, Input, Output, State
import dash_bootstrap_components as dbc

from pages.login_page import create_login_layout
from pages.dashboard import create_dashboard_layout
from helper.auth.auth_helpers import is_user_authenticated
from helper.requests.refresh_request import refresh_token as refresh_access_token
import helper.environment as env

# =============================================================================
# Basic Configuration
# =============================================================================

FRONTEND_HOST: str = env.FRONTEND_HOST
FRONTEND_PORT: int = env.FRONTEND_PORT
DEVELOPMENT_MODE: bool = env.DEVELOPMENT_MODE
BACKEND_URL: str = env.BACKEND_URL
BACKEND_API_KEY: str = env.BACKEND_API_KEY

# =============================================================================
# APP INITIALIZATION
# =============================================================================

# Initialize the Dash app with Bootstrap theme
app = dash.Dash(
    __name__,
    external_stylesheets=[dbc.themes.BOOTSTRAP],
)

app.title = "Budget Dashboard"

# =============================================================================
# MAIN APP LAYOUT
# =============================================================================

app.layout = html.Div([
    
    # Store authentication data
    dcc.Store(
        id='auth-store',
        data={'logged': False},
        storage_type='local'
    ),
    # Store authentication tokens and user data
    dcc.Store(
        id='token-store',
        data={
            'access_token': '',
            'refresh_token': '',
            'email': '',
            'user': None,
            'session': None
        },
        storage_type='local'
    ),
    
    # Store profile data (preloaded after login)
    dcc.Store(
        id='profile-store',
        data={},
        storage_type='local'
    ),
    # Store overview data (preloaded after login)
    dcc.Store(
        id='overview-store',
        data={},
        storage_type='local'
    ),
    # Store for navigation state
    dcc.Store(
        id='navigation-store',
        data={'active_tab': 'overview'},
        storage_type='local'
    ),
    # Store for user settings
    dcc.Store(
        id='user-settings-store',
        data={},
        storage_type='local'
    ),
    # Token refresh interval - checks every 45 minutes 
    # (disabled in production until logged in)
    dcc.Interval(
        id='token-refresh-interval',
        interval=30*60*1000,  # 30 minutes in milliseconds
    ),
    
    # Main content area
    html.Div(id='main-content')
], className='app-container')

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
    Output('token-store', 'data', allow_duplicate=True),
    Input('logout-button', 'n_clicks'),
    prevent_initial_call=True
)
def handle_logout(n_clicks):
    """Handle logout button click"""
    if n_clicks:
        # Reset auth store to logged out state
        auth_data = {
            'logged': False
        }
        token_data = {
            'access_token': '',
            'refresh_token': '',
            'email': '',
            'user': None,
            'session': None
        }

        return auth_data, token_data
    

    return dash.no_update, dash.no_update


# =============================================================================
# Refresh Token Callback
# =============================================================================

@app.callback(
    Output('auth-store', 'data', allow_duplicate=True),
    Output('token-store', 'data', allow_duplicate=True),
    Input('token-refresh-interval', 'n_intervals'),
    State('token-store', 'data'),
    prevent_initial_call=True
)
def refresh_token_periodically(n_intervals, token_data):
    """Automatically refresh token when interval triggers"""
    
    # Only refresh if user is logged in and has a refresh token
    if not token_data or not token_data.get('refresh_token'):
        return dash.no_update, dash.no_update
    
    # Attempt to refresh the token
    try:
        data = refresh_access_token(token_data['refresh_token'])

        # Update token data with new values
        token_data['access_token'] = data.get('access_token', token_data['access_token'])
        token_data['refresh_token'] = data.get('refresh_token', token_data['refresh_token'])
        token_data['user'] = data.get('user', token_data['user'])
        token_data['session'] = data.get('session', token_data['session'])

        # Return auth data (unchanged) and updated token data
        return dash.no_update, token_data

    except Exception as e:
        # If refresh fails, log out the user
        print(f"Token refresh failed: {e}")
        return {'logged': False}, {
            'email': '',
            'access_token': '',
            'refresh_token': '',
            'user': None,
            'session': None
        }


# =============================================================================
# RUN THE APPLICATION
# =============================================================================

if __name__ == "__main__":
    app.run(debug=DEVELOPMENT_MODE, host=FRONTEND_HOST, port=FRONTEND_PORT)