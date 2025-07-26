from dash import html, Input, Output, callback, State
import dash

import dash_bootstrap_components as dbc

from helper.auth.validation import validate_registration_form
from helper.requests.register_request import register_user



# =============================================================================
# LAYOUT
# =============================================================================


def create_register_tab_layout():
    """Main static layout for the registration page"""
    
    return html.Div([
        dbc.Container([
            dbc.Row([
                dbc.Col([
                    # Registration Card
                    html.Div([
                        # Header
                        html.Div([
                            html.H3("Budget Dashboard", className="heading heading-large"),
                            html.P("Create Your Account", className="subheading subheading-large")
                        ]),
                        
                        # Error Alert (initially hidden)
                        dbc.Alert(
                            id="register-error-alert",
                            is_open=False,
                            dismissable=True,
                            color="danger",
                            className="error-alert"
                        ),
                        
                        # Success Alert (initially hidden)
                        dbc.Alert(
                            id="register-success-alert",
                            is_open=False,
                            dismissable=True,
                            color="success",
                            className="success-alert"
                        ),
                        
                        # Registration Form
                        html.Div([
                            # Email Input
                            html.Div([
                                html.Label(
                                    "Email Address",
                                    htmlFor="register-email-input",
                                    className="form-label"
                                ),
                                dbc.Input(
                                    id="register-email-input",
                                    type="email",
                                    placeholder="Enter your email",
                                    className="form-input mb-4"
                                ),
                                # Email validation message
                                html.Div(
                                    id="email-validation-message",
                                    className="validation-message"
                                ),
                            ]),
                            
                            # Full Name Input (Optional)
                            html.Div([
                                html.Label(
                                    "Full Name (Optional)",
                                    htmlFor="register-fullname-input",
                                    className="form-label"
                                ),
                                dbc.Input(
                                    id="register-fullname-input",
                                    type="text",
                                    placeholder="Enter your full name",
                                    className="form-input mb-4"
                                ),
                                # Full name validation message
                                html.Div(
                                    id="fullname-validation-message",
                                    className="validation-message"
                                ),
                            ]),
                            
                            # Password Input
                            html.Div([
                                html.Label(
                                    "Password",
                                    htmlFor="register-password-input",
                                    className="form-label"
                                ),
                                dbc.Input(
                                    id="register-password-input",
                                    type="password",
                                    placeholder="Enter your password",
                                    className="form-input mb-4"
                                ),
                                # Password validation message
                                html.Div(
                                    id="password-validation-message",
                                    className="validation-message"
                                ),
                            ]),
                            
                            # Confirm Password Input
                            html.Div([
                                html.Label(
                                    "Confirm Password",
                                    htmlFor="register-confirm-password-input",
                                    className="form-label"
                                ),
                                dbc.Input(
                                    id="register-confirm-password-input",
                                    type="password",
                                    placeholder="Confirm your password",
                                    className="form-input mb-4"
                                ),
                                # Confirm password validation message
                                html.Div(
                                    id="confirm-password-validation-message",
                                    className="validation-message mb-24"
                                ),
                            ]),
                            
                            # Password Requirements Info
                            html.Div([
                                html.P("Password Requirements:"),
                                html.Ul([
                                    html.Li("At least 8 characters"),
                                    html.Li("At least 1 uppercase letter"),
                                    html.Li("At least 1 lowercase letter"),
                                    html.Li("At least 1 number")
                                ])
                            ], className="password-info"),
                            
                            # Terms and Privacy Policy Checkbox
                            html.Div([
                                dbc.Checkbox(
                                    id="terms-checkbox",
                                    value=False,
                                    className="mr-8"
                                ),
                                html.Span([
                                    "I agree to the ",
                                    html.Button(
                                        "Terms of Service",
                                        id="terms-of-service-link",
                                        className="link-button",
                                    ),
                                    " and ",
                                    html.Button(
                                        "Privacy Policy",
                                        id="privacy-policy-link",
                                        className="link-button",
                                    )
                                ], className="subheading")
                            ], className="terms-container"),
                            
                            # Register Button
                            html.Div([
                                dbc.Button(
                                    "Create Account",
                                    id="register-button",
                                    type="button",
                                    className="btn-primary mb-20"
                                ),
                            ]),
                            
                            # Back to Login Link
                            html.Div([
                                html.Span(
                                    "Already have an account? ",
                                    className="subheading"
                                ),
                                html.Button(
                                    "Sign in",
                                    id="back-to-login-link",
                                    className="link-button"
                                )
                            ], className="text-center")
                        ])
                    ], className="card register-card")
                ], width=12)
            ], justify="center", className="centered-row")
        ], fluid=True, className="padded-container")
    ], className="app-container")


# =============================================================================
# CALLBACKS
# =============================================================================

@callback(
    [Output('auth-store', 'data', allow_duplicate=True),
     Output('token-store', 'data', allow_duplicate=True),
     Output('register-success-alert', 'children'),
     Output('register-success-alert', 'is_open'),
     Output('register-error-alert', 'children'),
     Output('register-error-alert', 'is_open')],
    Input('register-button', 'n_clicks'),
    [State('register-email-input', 'value'),
     State('register-fullname-input', 'value'),
     State('register-password-input', 'value'),
     State('register-confirm-password-input', 'value'),
     State('terms-checkbox', 'value'),
     State('auth-store', 'data'),
     State('token-store', 'data')],
    prevent_initial_call=True
)
def handle_register_form_submit(n_clicks, email, full_name, password, confirm_password, terms_accepted, current_auth_data, current_token_data):
    """Handle registration form submission using validation helper and API integration"""
    
    # If no clicks, do nothing
    if not n_clicks:
        return dash.no_update, dash.no_update, "", False, "", False
    
    try:
        # Set defaults for empty inputs
        email = email or ""
        full_name = full_name or ""
        password = password or ""
        confirm_password = confirm_password or ""
        
        # Basic validation first
        if not email or not password or not confirm_password:
            return dash.no_update, dash.no_update, "", False, "Please fill in all required fields", True
        
        # Check if terms are accepted
        if not terms_accepted:
            return dash.no_update, dash.no_update, "", False, "You must agree to the Terms of Service and Privacy Policy", True
        
        # Validate the registration form
        errors = validate_registration_form(email, full_name, password, confirm_password)
            
        if errors:
            # Collect all error messages
            all_errors = []
            for field_errors in errors.values():
                if isinstance(field_errors, list):
                    all_errors.extend(field_errors)
                else:
                    all_errors.append(str(field_errors))

            # Join error messages into a single string    
            error_message = " | ".join(all_errors)
            return dash.no_update, dash.no_update, "", False, f"Please fix the following errors: {error_message}", True
        
        # Proceed with registration request
        registration_response = register_user(email, password, full_name if full_name else None)
                
        if registration_response.get('success'):
            # Registration successful - extract authentication data
            response_data = registration_response.get('data', {})
            session_data = response_data.get('session', {})
            user_data = response_data.get('user', {})
                
            # Set authentication state
            auth = {'logged': True}
            token = {
                'access_token': session_data.get('access_token'),
                'refresh_token': session_data.get('refresh_token'),
                'email': email,
                'user': user_data,
                'session': session_data
            }
            
            # Show success message
            success_message = registration_response.get('message', 'Account created successfully!')
            return auth, token, success_message, True, "", False
        else:
            # Registration failed - show error message
            error_message = registration_response.get('message', 'Registration failed')
            return dash.no_update, dash.no_update, "", False, error_message, True
        
    except Exception as e:
        print(f"Error in registration submit callback: {e}")
        return dash.no_update, dash.no_update, "", False, "An unexpected error occurred. Please try again.", True

# =============================================================================
# Navigation Callbacks
# =============================================================================

@callback(
    Output('login-tab-store', 'data'),
    Input('back-to-login-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_from_register_to_login(n_clicks):
    """Navigate back to login tab when back to login link is clicked"""
    if n_clicks:
        return {'active_tab': 'login'}
    return {'active_tab': 'register'}


@callback(
    Output('login-tab-store', 'data', allow_duplicate=True),
    Input('terms-of-service-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_from_register_to_terms(n_clicks):
    """Navigate to terms of service tab when terms link is clicked"""
    if n_clicks:
        return {'active_tab': 'terms_of_service'}
    return {'active_tab': 'register'}


@callback(
    Output('login-tab-store', 'data', allow_duplicate=True),
    Input('privacy-policy-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_from_register_to_privacy(n_clicks):
    """Navigate to privacy policy tab when privacy policy link is clicked"""
    if n_clicks:
        return {'active_tab': 'privacy_policy'}
    return {'active_tab': 'register'}