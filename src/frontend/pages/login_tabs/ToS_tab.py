from dash import html, Input, Output, callback

import dash_bootstrap_components as dbc

# =============================================================================
# LAYOUT
# =============================================================================

def create_terms_of_service_tab_layout():
    """Create the terms of service tab layout"""
    
    return html.Div([
        dbc.Container([
            dbc.Row([
                dbc.Col([
                    # Terms of Service Card
                    html.Div([
                        # Header
                        html.Div([
                            html.H3("Terms of Service", className="heading heading-large"),
                            html.P("Budget Dashboard Terms of Service", className="subheading subheading-large")
                        ]),
                        
                        # Terms of Service Content
                        html.Div([
                            # Effective Date
                            html.P(
                                "Effective Date: 17/7/2025",
                                className="text-secondary fs-14 text-italic mb-24"
                            ),
                            
                            # Introduction
                            html.P(
                                ["By using this budget dashboard, you agree to the following terms:"],
                                className="text-secondary fs-14 mb-20"
                            ),
                            
                            # Section 1: Purpose of the Application
                            html.H4("1. Purpose of the Application", className="text-primary fs-18 font-bold mb-12"),
                            html.P([
                                "1.1. This application is a personal, non-commercial project created for the purpose ",
                                "of learning software development and data analytics."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "1.2. It is not intended for professional financial management, official recordkeeping, ",
                                "or commercial deployment."
                            ], className="text-secondary fs-14 mb-20"),
                            
                            # Section 2: Use of the Application
                            html.H4("2. Use of the Application", className="text-primary fs-18 font-bold mb-12"),
                            html.P([
                                "2.1. You may use this application solely for personal and educational purposes."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "2.2. You may not use this application for any unlawful, harmful, or commercial activities."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "2.3. You acknowledge that the application is experimental and may contain errors or incomplete features."
                            ], className="text-secondary fs-14 mb-20"),
                            
                            # Section 3: Limitation of Liability
                            html.H4("3. Limitation of Liability", className="text-primary fs-18 font-bold mb-12"),
                            html.P([
                                "3.1. The developer assumes no responsibility for data loss, incorrect calculations, ",
                                "or any consequences resulting from the use of the application."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "3.2. All data management and financial decisions remain the responsibility of the user."
                            ], className="text-secondary fs-14 mb-20"),
                            
                            # Section 4: Modifications and Availability
                            html.H4("4. Modifications and Availability", className="text-primary fs-18 font-bold mb-12"),
                            html.P([
                                "4.1. The developer may modify or discontinue the application at any time without notice."
                            ], className="text-secondary fs-14 mb-8"),
                            html.P([
                                "4.2. There is no guarantee of continued support or feature development."
                            ], className="text-secondary fs-14 mb-24")
                        ], className="content-box"),
                        # Back to Register Link
                        html.Div([
                            html.Button(
                                "← Back to Registration",
                                id="back-to-register-from-terms-link",
                                className="link-button"
                            )
                        ], className="text-center")
                    ], className="card tos-card")
                ], width=12)
            ], justify="center", className="centered-row")
        ], fluid=True, className="padded-container")
    ])


# =============================================================================
# CALLBACKS
# =============================================================================

@callback(
    Output('login-tab-store', 'data', allow_duplicate=True),
    Input('back-to-register-from-terms-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_from_terms_to_register(n_clicks):
    """Navigate back to register tab when back to register link is clicked"""
    if n_clicks:
        return {'active_tab': 'register'}
    return {'active_tab': 'terms_of_service'}
