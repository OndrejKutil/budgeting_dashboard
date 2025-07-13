# =============================================================================
# LOGIN PAGE
# =============================================================================
# Login page component with authentication form

import dash
from dash import html, dcc, Input, Output, callback
import dash_bootstrap_components as dbc
from helper.login_request import login_request

def create_login_layout():
    """Create the login page layout"""
    
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
    Output('auth-store', 'data'),
    Input('login-button', 'n_clicks'),
    [dash.dependencies.State('email-input', 'value'),
     dash.dependencies.State('password-input', 'value'),
     dash.dependencies.State('auth-store', 'data')],
    prevent_initial_call=True
)
def handle_login(n_clicks, email, password, current_auth_data):
    """Handle login button click and store credentials"""
    if n_clicks and email and password:

        data = login_request(email, password)
        data['logged'] = True

        return data
    
    # Return current data if no valid login attempt
    return current_auth_data
