from dash import html, Input, Output, callback
from utils.theme import COLORS, CARD_STYLE, INPUT_STYLE, BUTTON_PRIMARY_STYLE, HEADING_STYLE, SUBHEADING_STYLE, APP_STYLE
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
                            html.H3("Privacy Policy", style={
                                **HEADING_STYLE,
                                'marginBottom': '8px',
                                'fontSize': '32px'
                            }),
                            html.P("Budget Dashboard Privacy Policy", style={
                                **SUBHEADING_STYLE,
                                'marginBottom': '32px'
                            })
                        ]),
                        
                        # Privacy Policy Content
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
                                "This budget dashboard is a personal learning project developed by Ondřej Kutil. ",
                                "It is intended for educational use only and is not a commercial or production-grade application."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '20px'
                            }),
                            
                            # Section 1: Data Collection
                            html.H4("1. Data Collection", style={
                                'color': COLORS['text_primary'],
                                'fontSize': '18px',
                                'fontWeight': 'bold',
                                'marginBottom': '12px'
                            }),
                            html.P([
                                "1.1. The application may process financial inputs such as transaction amounts, ",
                                "categories, and notes as entered by the user."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "1.2. No personal identifiers (such as name, email, or account credentials) are ",
                                "required or collected unless explicitly added by the user."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '20px'
                            }),
                            
                            # Section 2: Data Storage and Security
                            html.H4("2. Data Storage and Security", style={
                                'color': COLORS['text_primary'],
                                'fontSize': '18px',
                                'fontWeight': 'bold',
                                'marginBottom': '12px'
                            }),
                            html.P([
                                "2.1. Data is stored in environments such as Supabase."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "2.2. This project does not include advanced security features such as encryption, ",
                                "access controls, or production-level authentication."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "2.3. Users are responsible for the security and privacy of their own data."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '20px'
                            }),
                            
                            # Section 3: Data Sharing
                            html.H4("3. Data Sharing", style={
                                'color': COLORS['text_primary'],
                                'fontSize': '18px',
                                'fontWeight': 'bold',
                                'marginBottom': '12px'
                            }),
                            html.P([
                                "3.1. No data is shared with third parties."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "3.2. All processing occurs locally or within services explicitly set up by the user."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '20px'
                            }),
                            
                            # Section 4: Disclaimer
                            html.H4("4. Disclaimer", style={
                                'color': COLORS['text_primary'],
                                'fontSize': '18px',
                                'fontWeight': 'bold',
                                'marginBottom': '12px'
                            }),
                            html.P([
                                "4.1. This project is provided as-is, without warranties of any kind."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "4.2. As this is a personal educational tool, bugs or unintended behavior may occur."
                            ], style={
                                'color': COLORS['text_primary'],
                                'fontSize': '14px',
                                'marginBottom': '8px'
                            }),
                            html.P([
                                "4.3. Use at your own risk."
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
                                id="back-to-register-link",
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
    Input('back-to-register-link', 'n_clicks'),
    prevent_initial_call=True
)
def navigate_from_privacy_policy_to_register(n_clicks):
    """Navigate back to register tab when back to register link is clicked"""
    if n_clicks:
        return {'active_tab': 'register'}
    return {'active_tab': 'privacy_policy'}
