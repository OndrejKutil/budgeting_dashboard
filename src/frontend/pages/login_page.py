# =============================================================================
# LOGIN PAGE
# =============================================================================
# Login page component with authentication form

import dash
from dash import html, Input, Output, callback, State
import dash_bootstrap_components as dbc
from helper.requests.login_request import login_request
from helper.requests.profile_request import request_profile_data
from utils.theme import COLORS, CARD_STYLE, INPUT_STYLE, BUTTON_PRIMARY_STYLE, HEADING_STYLE, SUBHEADING_STYLE, APP_STYLE, CENTERED_CONTAINER_STYLE
import json

def create_login_layout():
    """Main static layout for the login page"""
    
    return html.Div([
        dbc.Container([
            dbc.Row([
                dbc.Col([
                    # Login Card
                    html.Div([
                        # Header
                        html.Div([
                            html.H3("Budget Dashboard", style={
                                **HEADING_STYLE,
                                'marginBottom': '8px',
                                'fontSize': '32px'
                            }),
                            html.P("Welcome Back!", style={
                                **SUBHEADING_STYLE,
                                'marginBottom': '32px'
                            })
                        ]),
                        
                        # Error Alert (initially hidden)
                        dbc.Alert(
                            id="login-error-alert",
                            is_open=False,
                            dismissable=True,
                            color="danger",
                            style={
                                'marginBottom': '20px',
                                'backgroundColor': COLORS['accent_danger'],
                                'border': 'none',
                                'color': 'white'
                            }
                        ),
                        
                        # Login Form
                        html.Form([
                            # Email Input
                            html.Div([
                                html.Label("Email Address", 
                                    htmlFor="email-input", 
                                    style={
                                        'color': COLORS['text_primary'],
                                        'fontWeight': 'bold',
                                        'marginBottom': '8px',
                                        'display': 'block'
                                    }
                                ),
                                dbc.Input(
                                    id="email-input",
                                    type="email",
                                    placeholder="Enter your email",
                                    style={
                                        **INPUT_STYLE,
                                        'marginBottom': '16px'
                                    }
                                ),
                            ]),
                            
                            # Password Input
                            html.Div([
                                html.Label("Password", 
                                    htmlFor="password-input", 
                                    style={
                                        'color': COLORS['text_primary'],
                                        'fontWeight': 'bold',
                                        'marginBottom': '8px',
                                        'display': 'block'
                                    }
                                ),
                                dbc.Input(
                                    id="password-input",
                                    type="password",
                                    placeholder="Enter your password",
                                    style={
                                        **INPUT_STYLE,
                                        'marginBottom': '8px'
                                    }
                                ),
                                # Forgot Password Link
                                html.Div([
                                    html.A("Forgot your password?", 
                                        href="#", 
                                        style={
                                            'color': COLORS['accent_primary'],
                                            'textDecoration': 'none',
                                            'fontSize': '14px',
                                            'cursor': 'pointer'
                                        }
                                    )
                                ], style={'textAlign': 'right', 'marginBottom': '24px'})
                            ]),
                            
                            # Login Button
                            html.Div([
                                dbc.Button(
                                    "Sign In",
                                    id="login-button",
                                    style={
                                        **BUTTON_PRIMARY_STYLE,
                                        'marginBottom': '20px'
                                    }
                                ),
                            ]),
                            
                            # Sign up Link
                            html.Div([
                                html.Span("Don't have an account? ", 
                                    style={
                                        'color': COLORS['text_secondary'],
                                        'fontSize': '14px'
                                    }
                                ),
                                html.A("Sign up", 
                                    href="#", 
                                    style={
                                        'color': COLORS['accent_primary'],
                                        'textDecoration': 'none',
                                        'fontWeight': 'bold',
                                        'fontSize': '14px',
                                        'cursor': 'pointer'
                                    }
                                )
                            ], style={'textAlign': 'center'})
                        ])
                    ], style={
                        **CARD_STYLE,
                        'width': '400px',
                        'maxWidth': '90vw',
                        'margin': '0 auto'
                    })
                ], width=12)
            ], justify="center", style={'minHeight': '100vh', 'display': 'flex', 'alignItems': 'center'})
        ], fluid=True, style={'padding': '20px'})
    ], style=APP_STYLE)

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
