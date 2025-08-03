from dash import html, Input, Output, callback

import dash_bootstrap_components as dbc

# =============================================================================
# LAYOUT
# =============================================================================

def create_privacy_policy_tab_layout():
    """Create the privacy policy tab layout"""
    
    return html.Div([
        dbc.Container([
            dbc.Row([
                dbc.Col([
                    # Privacy Policy Card
                    html.Div([
                        # Header
                        html.Div([
                            html.H3("Privacy Policy", className="heading heading-large"),
                            html.P("Budget Dashboard Privacy Policy", className="subheading subheading-large")
                        ]),
                        
                        # Privacy Policy Content
                        html.Div([
                            # Effective Date
                            html.P(
                                "Effective Date: 17/7/2025",
                                className="text-secondary fs-14 text-italic mb-24"
                            ),
                            
                            # Introduction
                            html.P([
                                "This budget dashboard is a personal learning project developed by Ondřej Kutil. ",
                                "It is intended for educational use only and is not a commercial or production-grade application."
                            ], className="text-secondary fs-14 mb-20"),
                            
                            # Section 1: Data Collection
                            html.H4("1. Data Collection", className="text-primary fs-18 font-bold mb-12"),
                            html.P([
                                "1.1. The application may process financial inputs such as transaction amounts, ",
                                "categories, and notes as entered by the user."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "1.2. No personal identifiers (such as name, email, or account credentials) are ",
                                "required or collected unless explicitly added by the user."
                            ], className="text-secondary fs-14 mb-20"),
                            
                            # Section 2: Data Storage and Security
                            html.H4("2. Data Storage and Security", className="text-primary fs-18 font-bold mb-12"),
                            html.P([
                                "2.1. Data is stored in environments such as Supabase."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "2.2. This project does not include advanced security features such as encryption, ",
                                "access controls, or production-level authentication."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "2.3. Users are responsible for the security and privacy of their own data."
                            ], className="text-secondary fs-14 mb-20"),
                            
                            # Section 3: Data Sharing
                            html.H4("3. Data Sharing", className="text-primary fs-18 font-bold mb-12"),
                            html.P([
                                "3.1. No data is shared with third parties."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "3.2. All processing occurs locally or within services explicitly set up by the user."
                            ], className="text-secondary fs-14 mb-20"),
                            
                            # Section 4: Disclaimer
                            html.H4("4. Disclaimer", className="text-primary fs-18 font-bold mb-12"),
                            html.P([
                                "4.1. This project is provided as-is, without warranties of any kind."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "4.2. As this is a personal educational tool, bugs or unintended behavior may occur."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "4.3. Use at your own risk."
                            ], className="text-secondary fs-14 mb-24")
                        ], className="content-box"),
                        # Back to Register Link
                        html.Div([
                            html.Button(
                                "← Back to Registration",
                                id="back-to-register-link",
                                className="link-button"
                            )
                        ], className="text-center")
                    ], className="card pp-card")
                ], width=12)
            ], justify="center", className="centered-row")
        ], fluid=True, className="padded-container")
    ])


# =============================================================================
# CALLBACKS
# =============================================================================

@callback(
    Output('login-tab-store', 'data', allow_duplicate=True),
    Input('back-to-register-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_from_privacy_policy_to_register(n_clicks):
    """Navigate back to register tab when back to register link is clicked"""
    if n_clicks:
        return {'active_tab': 'register'}
    return {'active_tab': 'privacy_policy'}
