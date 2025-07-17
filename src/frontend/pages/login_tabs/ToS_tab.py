from dash import html, Input, Output, callback
from utils.theme import COLORS, CARD_STYLE, INPUT_STYLE, BUTTON_PRIMARY_STYLE, HEADING_STYLE, SUBHEADING_STYLE, APP_STYLE
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
                            html.H3("Terms of Service", style={
                                **HEADING_STYLE,
                                'marginBottom': '8px',
                                'fontSize': '32px'
                            }),
                            html.P("Budget Dashboard Terms of Service", style={
                                **SUBHEADING_STYLE,
                                'marginBottom': '32px'
                            })
                        ]),
                        
                        # Terms of Service Content
                        html.Div([
                            # Effective Date
                            html.P("Effective Date: 17/7/2025", style={
                                'color': COLORS['text_secondary'],
                                'fontSize': '14px',
                                'fontStyle': 'italic',
                                'marginBottom': '24px'
                            }),
                            
                            # Introduction
                            html.P([
                                "By using this budget dashboard, you agree to the following terms:"
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '20px'
                            }),
                            
                            # Section 1: Purpose of the Application
                            html.H4("1. Purpose of the Application", style={
                                'color': COLORS['text_primary'],
                                'fontSize': '18px',
                                'fontWeight': 'bold',
                                'marginBottom': '12px'
                            }),
                            html.P([
                                "1.1. This application is a personal, non-commercial project created for the purpose ",
                                "of learning software development and data analytics."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "1.2. It is not intended for professional financial management, official recordkeeping, ",
                                "or commercial deployment."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '20px'
                            }),
                            
                            # Section 2: Use of the Application
                            html.H4("2. Use of the Application", style={
                                'color': COLORS['text_primary'],
                                'fontSize': '18px',
                                'fontWeight': 'bold',
                                'marginBottom': '12px'
                            }),
                            html.P([
                                "2.1. You may use this application solely for personal and educational purposes."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "2.2. You may not use this application for any unlawful, harmful, or commercial activities."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "2.3. You acknowledge that the application is experimental and may contain errors or incomplete features."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '20px'
                            }),
                            
                            # Section 3: Limitation of Liability
                            html.H4("3. Limitation of Liability", style={
                                'color': COLORS['text_primary'],
                                'fontSize': '18px',
                                'fontWeight': 'bold',
                                'marginBottom': '12px'
                            }),
                            html.P([
                                "3.1. The developer assumes no responsibility for data loss, incorrect calculations, ",
                                "or any consequences resulting from the use of the application."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "3.2. All data management and financial decisions remain the responsibility of the user."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '20px'
                            }),
                            
                            # Section 4: Modifications and Availability
                            html.H4("4. Modifications and Availability", style={
                                'color': COLORS['text_primary'],
                                'fontSize': '18px',
                                'fontWeight': 'bold',
                                'marginBottom': '12px'
                            }),
                            html.P([
                                "4.1. The developer may modify or discontinue the application at any time without notice."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "4.2. There is no guarantee of continued support or feature development."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '24px'
                            })
                        ], style={
                            'maxHeight': '400px',
                            'overflowY': 'auto',
                            'padding': '16px',
                            'backgroundColor': COLORS['background_secondary'],
                            'borderRadius': '8px',
                            'marginBottom': '24px'
                        }),
                        
                        # Back to Register Link
                        html.Div([
                            html.Button("← Back to Registration",  
                                id="back-to-register-from-terms-link",
                                style={
                                    'color': COLORS['accent_primary'],
                                    'textDecoration': 'none',
                                    'fontWeight': 'bold',
                                    'fontSize': '14px',
                                    'cursor': 'pointer',
                                    'background': 'none',
                                    'border': 'none',
                                    'padding': '8px 0'
                                }
                            )
                        ], style={'textAlign': 'center'})
                    ], style={
                        **CARD_STYLE,
                        'width': '800px',
                        'maxWidth': '95vw',
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
    Output('login-tab-store', 'data', allow_duplicate=True),
    Input('back-to-register-from-terms-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_from_terms_to_register(n_clicks):
    """Navigate back to register tab when back to register link is clicked"""
    if n_clicks:
        return {'active_tab': 'register'}
    return {'active_tab': 'terms_of_service'}
