from dash import html, Input, Output, callback, State
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
                            html.H3("Budget Dashboard", className="heading heading-large"),
                            html.P("Welcome Back!", className="subheading subheading-large")
                        ]),
                        
                        # Error Alert (initially hidden)
                        dbc.Alert(
                            id="login-error-alert",
                            is_open=False,
                            dismissable=True,
                            color="danger",
                            className="error-alert"
                        ),
                        
                        # Login Form
                        html.Div([
                            # Email Input
                            html.Div([
                                html.Label(
                                    "Email Address",
                                    htmlFor="email-input",
                                    className="form-label"
                                ),
                                dbc.Input(
                                    id="email-input",
                                    type="email",
                                    placeholder="Enter your email",
                                    className="form-input mb-16"
                                ),
                            ]),
                            
                            # Password Input
                            html.Div([
                                html.Label(
                                    "Password",
                                    htmlFor="password-input",
                                    className="form-label"
                                ),
                                dbc.Input(
                                    id="password-input",
                                    type="password",
                                    placeholder="Enter your password",
                                    className="form-input mb-8"
                                ),
                                # Forgot Password Link
                                html.Div([
                                    html.Button(
                                        "Forgot your password?",
                                        id="forgot-password-link",
                                        className="link-button"
                                    )
                                ], className="forgot-link-container")
                            ]),
                            
                            # Login Button
                            html.Div([
                                dbc.Button(
                                    "Sign In",
                                    id="login-button",
                                    type="button",
                                    className="btn-primary mb-20 login-button",
                                ),
                            ]),
                            
                            # Sign up Link
                            html.Div([
                                html.Span(
                                    "Don't have an account? ",
                                    className="subheading"
                                ),
                                html.Button(
                                    "Sign up",
                                    id="signup-link",
                                    className="link-button"
                                )
                            ], className="text-center")
                        ])
                    ], className="card login-card")
                ], width=12)
            ], justify="center", className="centered-row")
        ], fluid=True, className="padded-container")
    ])


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


