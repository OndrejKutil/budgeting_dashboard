import dash
from dash import html, dcc, Input, Output, State
import dash_bootstrap_components as dbc
from utils.theme import APP_STYLE
from pages.login import create_login_layout
from pages.dashboard import create_dashboard_layout
from helper.auth_helpers import is_user_authenticated
from dotenv import load_dotenv
import os

# =============================================================================
# Basic Configuration
# =============================================================================

load_dotenv()

FRONTEND_HOST = os.getenv("FRONTEND_HOST")
FRONTEND_PORT = os.getenv("FRONTEND_PORT")
DEVELOPMENT_MODE = os.getenv("DEVELOPMENT_MODE")

# =============================================================================
# APP INITIALIZATION
# =============================================================================

# Initialize the Dash app with Bootstrap theme
app = dash.Dash(
    __name__, 
    external_stylesheets=[dbc.themes.BOOTSTRAP],
    suppress_callback_exceptions=True
)


app.title = "Budget Dashboard"

# =============================================================================
# MAIN APP LAYOUT
# =============================================================================

if DEVELOPMENT_MODE == 'True':
    ACCESS_TOKEN = os.getenv("DEBUG_ACCESS_TOKEN")

    app.layout = html.Div([
    
    # Store authentication data
    dcc.Store(
        id='auth-store',
        data={
            'logged': True
        }
    ),
    dcc.Store(
        id='token-store',
        data={
            'access_token': ACCESS_TOKEN,
            'refresh_token': '',
            'email': 'user@example.com',
            'user': None,
            'session': None
        }
    ),

    dcc.Interval(
        id='token-refresh-interval',
        interval=45*60*1000,  # 45 minutes in milliseconds
        n_intervals=0,
        disabled=False
    ),
    
    # Main content area
    html.Div(id='main-content')
    
    ], style=APP_STYLE)
    
else:
    app.layout = html.Div([
        
        # Store authentication data
        dcc.Store(
            id='auth-store',
            data={
                'logged': False
            }
        ),
        dcc.Store(
            id='token-store',
            data={
                'access_token': '',
                'refresh_token': '',
                'email': '',
                'user': None,
                'session': None
            }
        ),

        # Token refresh interval - checks every 45 minutes (disabled in production until logged in)
        dcc.Interval(
            id='token-refresh-interval',
            interval=45*60*1000,  # 45 minutes in milliseconds
            n_intervals=0,
            disabled=True  # Disabled until user logs in
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
# ENABLE INTERVAL CALLBACK
# =============================================================================

@app.callback(
    Output('token-refresh-interval', 'disabled'),
    Input('auth-store', 'data'),
    prevent_initial_call=True
)
def toggle_token_refresh_interval(auth_data):
    """Enable/disable token refresh interval based on login status"""
    if auth_data and auth_data.get('logged'):
        return False  # Enable interval when logged in
    else:
        return True   # Disable interval when logged out

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
    
    
    return dash.no_update



# =============================================================================
# Refresh Token Callback
# =============================================================================

@app.callback(
    Output('token-store', 'data', allow_duplicate=True),
    Input('token-refresh-interval', 'n_intervals'),
    prevent_initial_call=True
)
def refresh_token_periodically(n_intervals, token_data):
    """Automatically refresh token when interval triggers"""
    
    # Only refresh if user is logged in and has a refresh token
    if not token_data or not token_data.get('refresh_token'):
        return dash.no_update
    
    # Check if token is close to expiring (implement your token expiry logic here)
    # For now, just refresh every time the interval triggers
    try:
        # Here you would call your backend to refresh the token
        # response = requests.post('your-backend/refresh', json={'refresh_token': auth_data['refresh_token']})
        # new_token = response.json()['access_token']
        
        # For now, just return the same data (placeholder)
        return token_data

    except Exception as e:
        # If refresh fails, log out the user
        print(f"Token refresh failed: {e}")
        return {
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
    # Run the app in debug mode for development
    print(f"Running app on http://{FRONTEND_HOST}:{FRONTEND_PORT}")
    print(f"Development mode: {DEVELOPMENT_MODE}")
    app.run(debug=DEVELOPMENT_MODE, host=FRONTEND_HOST, port=FRONTEND_PORT)