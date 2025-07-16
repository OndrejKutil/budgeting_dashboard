# =============================================================================
# LOGIN PAGE
# =============================================================================
# Login page component with authentication form

import dash
from dash import html, Input, Output, callback, State
import dash_bootstrap_components as dbc
from helper.requests.login_request import login_request
from helper.requests.profile_request import request_profile_data
import json

def create_login_layout():
    """Main static layout for the login page"""
    
    return dbc.Container([
        dbc.Row([
            dbc.Col([
                # Login Card
                dbc.Card([
                    dbc.CardHeader([
                        html.H3("Budget Dashboard", className="text-center mb-0", style={'color': '#2c3e50'})
                    ], style={'background-color': '#ecf0f1', 'border-bottom': '2px solid #3498db'}),
                    
                    dbc.CardBody([
                        html.H4("Welcome Back!", className="text-center mb-4", style={'color': '#34495e'}),
                        
                        # Error Alert (initially hidden)
                        dbc.Alert(
                            id="login-error-alert",
                            is_open=False,
                            dismissable=True,  # Allow user to close manually
                            color="danger",
                            style={'margin-bottom': '20px'}
                        ),
                        
                        # Login Form
                        dbc.Form([
                            # Email Input
                            dbc.Row([
                                dbc.Col([
                                    dbc.Label("Email Address", html_for="email-input", style={'font-weight': 'bold'}),
                                    dbc.Input(
                                        id="email-input",
                                        type="email",
                                        placeholder="Enter your email",
                                        style={'margin-bottom': '15px'}
                                    ),
                                ], width=12)
                            ]),
                            
                            # Password Input
                            dbc.Row([
                                dbc.Col([
                                    dbc.Label("Password", html_for="password-input", style={'font-weight': 'bold'}),
                                    dbc.Input(
                                        id="password-input",
                                        type="password",
                                        placeholder="Enter your password",
                                        style={'margin-bottom': '20px'}
                                    ),
                                ], width=12)
                            ]),
                            
                            # Remember Me Checkbox
                            dbc.Row([
                                dbc.Col([
                                    dbc.Checkbox(
                                        id="remember-me",
                                        label="Remember me",
                                        value=False,
                                        style={'margin-bottom': '20px'}
                                    ),
                                ], width=12)
                            ]),
                            
                            # Login Button
                            dbc.Row([
                                dbc.Col([
                                    dbc.Button(
                                        "Sign In",
                                        id="login-button",
                                        color="primary",
                                        size="lg",
                                        className="w-100",
                                        style={'margin-bottom': '15px'}
                                    ),
                                ], width=12)
                            ]),
                            
                            # Forgot Password Link
                            dbc.Row([
                                dbc.Col([
                                    html.Div([
                                        html.A("Forgot your password?", href="#", className="text-decoration-none"),
                                    ], className="text-center")
                                ], width=12)
                            ]),
                        ])
                    ], style={'padding': '30px'})
                ], style={
                    'max-width': '400px',
                    'margin': '0 auto',
                    'box-shadow': '0 4px 6px rgba(0, 0, 0, 0.1)',
                    'border': 'none'
                })
            ], width=12)
        ], justify="center", className="min-vh-100 align-items-center"),
        
        # Footer
        dbc.Row([
            dbc.Col([
                html.Div([
                    html.P("Don't have an account? ", className="d-inline mb-0"),
                    html.A("Sign up here", href="#", className="text-decoration-none fw-bold")
                ], className="text-center mt-3")
            ], width=12)
        ], justify="center")
        
    ], fluid=True, style={
        'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'min-height': '100vh',
        'padding': '20px'
    })

# =============================================================================
# LOGIN CALLBACKS
# =============================================================================

@callback(
    [Output('auth-store', 'data'),
     Output('token-store', 'data'),
     Output('login-error-alert', 'children'),
     Output('login-error-alert', 'is_open')],
    Input('login-button', 'n_clicks'),
    [State('email-input', 'value'),
     State('password-input', 'value'),
     State('auth-store', 'data'),
     State('token-store', 'data')],
    prevent_initial_call=True
)
def handle_login(n_clicks, email, password, current_auth_data, current_token_data):
    """Handle login button click and store credentials"""
    
    if n_clicks and email and password:
        try:
            data = login_request(email, password)
            
            if data.get('error'):
                # Handle login error - show alert to user, DON'T update auth-store
                error_message = f"{json.loads(data.get('message')).get('detail')}"
                return dash.no_update, dash.no_update, error_message, True  # Don't update stores!

            auth = {'logged': True}
            token = {
                'access_token': data['access_token'],
                'refresh_token': data['refresh_token'],
                'email': email,
                'user': data['user'],
                'session': data['session']
            }
            
            return auth, token, "", False
            
        except Exception as e:
            error_message = f"Connection error: {str(e)}"
            return dash.no_update, dash.no_update, error_message, True  # Don't update stores!

    if n_clicks and (not email or not password):
        # Show error if button clicked but fields are empty
        error_message = "Please enter both email and password"
        return dash.no_update, dash.no_update, error_message, True  # Don't update stores!

    # Return current data if no valid login attempt
    return dash.no_update, dash.no_update, "", False  # Don't update stores if no action


# Additional callback to hide alert when user starts typing
@callback(
    Output('login-error-alert', 'is_open', allow_duplicate=True),
    [Input('email-input', 'value'),
     Input('password-input', 'value')],
    prevent_initial_call=True
)
def hide_alert_on_input(email, password):
    """Hide error alert when user starts typing"""
    return False


# Callback to preload profile data after successful login
@callback(
    Output('profile-store', 'data'),
    Input('auth-store', 'data'),
    State('token-store', 'data'),
    prevent_initial_call=True
)
def preload_profile_data(auth_data, token_data):
    """Preload profile data immediately after successful login"""
    
    if auth_data and auth_data.get('logged') and token_data and token_data.get('access_token'):
        try:
            # Get profile data from API
            profile_data = request_profile_data(token_data['access_token'])
            if profile_data and not profile_data.get('error'):
                return profile_data
        except Exception as e:
            print(f"Error preloading profile data: {e}")
    
    # Return empty data if login failed or no token
    return {}
