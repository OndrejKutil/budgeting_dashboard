from dash import html, Input, Output, callback, State
from utils.theme import COLORS, CARD_STYLE, INPUT_STYLE, BUTTON_PRIMARY_STYLE, HEADING_STYLE, SUBHEADING_STYLE, APP_STYLE
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
                            html.H3("Reset Password", style={
                                **HEADING_STYLE,
                                'marginBottom': '8px',
                                'fontSize': '32px'
                            }),
                            html.P("Enter your email address and we'll send you a link to reset your password.", style={
                                **SUBHEADING_STYLE,
                                'marginBottom': '32px'
                            })
                        ]),
                        
                        # Success/Error Alert (initially hidden)
                        dbc.Alert(
                            id="forgot-password-alert",
                            is_open=False,
                            dismissable=True,
                            color="info",
                            style={
                                'marginBottom': '20px',
                                'backgroundColor': COLORS['accent_primary'],
                                'border': 'none',
                                'color': 'white'
                            }
                        ),
                        
                        # Forgot Password Form
                        html.Div([
                            # Email Input
                            html.Div([
                                html.Label("Email Address", 
                                    htmlFor="forgot-password-email-input", 
                                    style={
                                        'color': COLORS['text_primary'],
                                        'fontWeight': 'bold',
                                        'marginBottom': '8px',
                                        'display': 'block'
                                    }
                                ),
                                dbc.Input(
                                    id="forgot-password-email-input",
                                    type="email",
                                    placeholder="Enter your email address",
                                    style={
                                        **INPUT_STYLE,
                                        'marginBottom': '24px'
                                    }
                                ),
                            ]),
                            
                            # Reset Password Button
                            html.Div([
                                dbc.Button(
                                    "Send Reset Link",
                                    id="reset-password-button",
                                    type="button",
                                    style={
                                        **BUTTON_PRIMARY_STYLE,
                                        'marginBottom': '20px'
                                    }
                                ),
                            ]),
                            
                            # TODO: Future implementation placeholder
                            html.Div([
                            ], style={'display': 'none'}),
                            
                            # Back to Login Link
                            html.Div([
                                html.Span("Remember your password? ", 
                                    style={
                                        'color': COLORS['text_secondary'],
                                        'fontSize': '14px'
                                    }
                                ),
                                html.Button("Back to Login",  
                                    id="back-to-login-link",
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
