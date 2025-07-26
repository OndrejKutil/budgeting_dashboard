from dash import html, Input, Output, callback, State

import dash_bootstrap_components as dbc

# =============================================================================
# LAYOUT
# =============================================================================

def create_forgot_password_tab_layout():
    """Create the forgot password tab layout"""
    
    return html.Div([
        dbc.Container([
            dbc.Row([
                dbc.Col([
                    # Forgot Password Card
                    html.Div([
                        # Header
                        html.Div([
                            html.H3("Reset Password", className="heading heading-large"),
                            html.P("Enter your email address and we'll send you a link to reset your password.", className="subheading subheading-large")
                        ]),
                        
                        # Success/Error Alert (initially hidden)
                        dbc.Alert(
                            id="forgot-password-alert",
                            is_open=False,
                            dismissable=True,
                            color="info",
                            className="success-alert"
                        ),
                        
                        # Forgot Password Form
                        html.Div([
                            # Email Input
                            html.Div([
                                html.Label(
                                    "Email Address",
                                    htmlFor="forgot-password-email-input",
                                    className="form-label"
                                ),
                                dbc.Input(
                                    id="forgot-password-email-input",
                                    type="email",
                                    placeholder="Enter your email address",
                                    className="form-input mb-24"
                                ),
                            ]),
                            
                            # Reset Password Button
                            html.Div([
                                dbc.Button(
                                    "Send Reset Link",
                                    id="reset-password-button",
                                    type="button",
                                    className="btn-primary mb-20"
                                ),
                            ]),
                            
                            # TODO: Future implementation placeholder
                            html.Div([
                            ], className="hidden"),
                            
                            # Back to Login Link
                            html.Div([
                                html.Span("Remember your password? ", className="subheading"),
                                html.Button(
                                    "Back to Login",
                                    id="back-to-login-link",
                                    className="link-button"
                                )
                            ], className="text-center")
                        ])
                    ], className="card forgot-card")
                ], width=12)
            ], justify="center", className="centered-row")
        ], fluid=True, className="padded-container")
    ], className="app-container")


# =============================================================================
# NAVIGATION CALLBACKS
# =============================================================================

@callback(
    Output('login-tab-store', 'data', allow_duplicate=True),
    Input('back-to-login-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_back_to_login(n_clicks):
    """Navigate back to login tab when back to login link is clicked"""
    if n_clicks:
        return {'active_tab': 'login'}
    return {'active_tab': 'forgot_password'}


# =============================================================================
# RESET PASSWORD CALLBACK (PLACEHOLDER)
# =============================================================================

@callback(
    [Output('forgot-password-alert', 'children'),
     Output('forgot-password-alert', 'is_open'),
     Output('forgot-password-alert', 'color')],
    Input('reset-password-button', 'n_clicks'),
    State('forgot-password-email-input', 'value'),
    prevent_initial_call=True
)
def handle_password_reset(n_clicks, email):
    """Handle password reset button click - placeholder implementation"""
    if n_clicks:
        
        # TODO: =============================================
        # TODO: Implement actual password reset functionality
        # TODO: =============================================

        print("password reset button clicked, email:", email)
        
        return "Password reset functionality coming soon!", True, "info"
    
    return "", False, "info"
