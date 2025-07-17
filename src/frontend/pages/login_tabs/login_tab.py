from dash import html, Input, Output, callback, State
from utils.theme import COLORS, CARD_STYLE, INPUT_STYLE, BUTTON_PRIMARY_STYLE, HEADING_STYLE, SUBHEADING_STYLE, APP_STYLE
import dash_bootstrap_components as dbc
import dash
import json

from helper.requests.login_request import login_request

# =============================================================================
# LAYOUT
# =============================================================================

def create_login_tab_layout():
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
                        html.Div([
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
                                    html.Button("Forgot your password?", 
                                        id="forgot-password-link",
                                        style={
                                            'color': COLORS['accent_primary'],
                                            'textDecoration': 'none',
                                            'fontSize': '14px',
                                            'cursor': 'pointer',
                                            'background': 'none',
                                            'border': 'none'
                                        }
                                    )
                                ], style={'textAlign': 'right', 'marginBottom': '24px'})
                            ]),
                            
                            # Login Button
                            html.Div([
                                dbc.Button(
                                    "Sign In",
                                    id="login-button",
                                    type="button",
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
                                html.Button("Sign up",  
                                    id="signup-link",
                                    style={
                                        'color': COLORS['accent_primary'],
                                        'textDecoration': 'none',
                                        'fontWeight': 'bold',
                                        'fontSize': '14px',
                                        'cursor': 'pointer',
                                        'background': 'none',
                                        'border': 'none'
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
# CALLBACKS
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
            # Attempt to log in
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
            
        except Exception:
            error_message = f"Connection error"
            return dash.no_update, dash.no_update, error_message, True  # Don't update stores!

    if n_clicks and (not email or not password):
        # Show error if button clicked but fields are empty
        error_message = "Please enter both email and password"
        return dash.no_update, dash.no_update, error_message, True  # Don't update stores!

    # Return current data if no valid login attempt
    return dash.no_update, dash.no_update, "", False  # Don't update stores if no action


# =============================================================================
# NAVIGATION CALLBACKS
# =============================================================================

@callback(
    Output('login-tab-store', 'data', allow_duplicate=True),
    Input('signup-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_to_signup(n_clicks):
    """Navigate to signup/register tab when signup link is clicked"""
    if n_clicks:
        return {'active_tab': 'register'}
    return {'active_tab': 'login'}


@callback(
    Output('login-tab-store', 'data', allow_duplicate=True),
    Input('forgot-password-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_to_forgot_password(n_clicks):
    """Navigate to forgot password tab when forgot password link is clicked"""
    if n_clicks:
        return {'active_tab': 'forgot_password'}
    return {'active_tab': 'login'}


