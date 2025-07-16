from dash import html, dcc, Input, State, Output, callback
import dash_bootstrap_components as dbc
from utils.theme import COLORS, CARD_STYLE
from datetime import datetime


def create_profile_tab():
    """Create the profile tab content"""
    
    content_card_style = {
        **CARD_STYLE,
        'backgroundColor': COLORS['background_secondary'],
        'margin': '0',
        'borderRadius': '8px',
        'minHeight': '400px'
    }
    
    return html.Div([
        html.Div([
            html.H1("Profile Settings", style={
                'color': COLORS['text_primary'],
                'margin': '0',
                'flex': '1'
            }),
            html.Button(
                "Logout", 
                id="logout-button", 
                className="btn btn-danger"
            )
        ], style={
            'display': 'flex',
            'justifyContent': 'space-between',
            'alignItems': 'center',
            'marginBottom': '20px'
        }),
        
        # Profile content with placeholder structure
        html.Div([
            # Basic Information Card
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Basic Information", className="mb-0", style={'color': COLORS['text_primary']})
                ]),
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Email:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-email", children="Loading...", className="mb-2", style={'color': COLORS['text_secondary']})
                        ], width=6),
                        dbc.Col([
                            html.Strong("Role:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-role", children="Loading...", className="mb-2", style={'color': COLORS['text_secondary']})
                        ], width=6),
                    ]),
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Phone:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-phone", children="Loading...", className="mb-2", style={'color': COLORS['text_secondary']})
                        ], width=6),
                        dbc.Col([
                            # Empty column for layout balance
                        ], width=6),
                    ])
                ])
            ], className="mb-3", style={'backgroundColor': COLORS['background_secondary']}),
            
            # Account Status Card
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Account Status", className="mb-0", style={'color': COLORS['text_primary']})
                ]),
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Email Verified:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-email-verified", children=[
                                dbc.Badge("Loading...", color="secondary", className="ms-2")
                            ], className="mb-2")
                        ], width=6),
                        dbc.Col([
                            html.Strong("Phone Verified:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-phone-verified", children=[
                                dbc.Badge("Loading...", color="secondary", className="ms-2")
                            ], className="mb-2")
                        ], width=6),
                    ]),
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Anonymous User:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-anonymous", children=[
                                dbc.Badge("Loading...", color="secondary", className="ms-2")
                            ], className="mb-2")
                        ], width=6),
                        dbc.Col([
                            html.Strong("Provider:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-provider", children="Loading...", className="mb-2", style={'color': COLORS['text_secondary']})
                        ], width=6),
                    ])
                ])
            ], className="mb-3", style={'backgroundColor': COLORS['background_secondary']}),
            
            # Account Timeline Card
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Account Timeline", className="mb-0", style={'color': COLORS['text_primary']})
                ]),
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Account Created:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-created", children="Loading...", className="mb-2", style={'color': COLORS['text_secondary']})
                        ], width=6),
                        dbc.Col([
                            html.Strong("Last Updated:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-updated", children="Loading...", className="mb-2", style={'color': COLORS['text_secondary']})
                        ], width=6),
                    ]),
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Last Sign In:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-signin", children="Loading...", className="mb-2", style={'color': COLORS['text_secondary']})
                        ], width=6),
                        dbc.Col([
                            html.Strong("Email Confirmed:", style={'color': COLORS['text_primary']}),
                            html.P(id="profile-email-confirmed", children="Loading...", className="mb-2", style={'color': COLORS['text_secondary']})
                        ], width=6),
                    ])
                ])
            ], className="mb-3", style={'backgroundColor': COLORS['background_secondary']}),
            
            # Account Actions Card
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Account Actions", className="mb-0", style={'color': COLORS['text_primary']})
                ]),
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            dbc.Button(
                                "Update Profile",
                                color="primary",
                                size="sm",
                                className="me-2 mb-2",
                                disabled=True  # Placeholder for future functionality
                            ),
                            dbc.Button(
                                "Change Password",
                                color="secondary",
                                size="sm",
                                className="me-2 mb-2",
                                disabled=True  # Placeholder for future functionality
                            ),
                            dbc.Button(
                                "Download Data",
                                color="info",
                                size="sm",
                                className="mb-2",
                                disabled=True  # Placeholder for future functionality
                            )
                        ])
                    ])
                ])
            ], style={'backgroundColor': COLORS['background_secondary']})
        ])
    ], style=content_card_style)



# Callbacks for profile tab interactions
@callback(
    [Output("profile-email", "children"),
     Output("profile-role", "children"),
     Output("profile-phone", "children"),
     Output("profile-email-verified", "children"),
     Output("profile-phone-verified", "children"),
     Output("profile-anonymous", "children"),
     Output("profile-provider", "children"),
     Output("profile-created", "children"),
     Output("profile-updated", "children"),
     Output("profile-signin", "children"),
     Output("profile-email-confirmed", "children")],
    [Input('dashboard-tabs', 'value'),
     Input('profile-store', 'data')]  # Now using profile-store instead of token-store
)
def update_profile_content(current_tab, profile_data):
    
    print(f"Profile tab callback - Tab: {current_tab}, Profile data: {profile_data}")
    
    # Only update if profile tab is currently selected
    if current_tab != 'profile':
        return (["Loading..."] * 11)  # Return loading for all fields
    
    if not profile_data or not profile_data.get('data'):
        # If no profile data in store, show placeholders
        print("No profile data in store")
        return (["Loading..."] * 11)

    try:
        # Profile data is already loaded from the store
        data = profile_data['data']
        
        # Helper function to format dates
        def format_date(date_str):
            if not date_str:
                return "Not set"
            try:
                dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                return dt.strftime("%B %d, %Y at %I:%M %p")
            except:
                return date_str
        
        # Return individual field values
        return (
            data.get('email', 'N/A'),  # email
            data.get('role', 'N/A').title(),  # role
            data.get('phone') or "Not provided",  # phone
            [dbc.Badge(
                "✓ Verified" if data.get('email_confirmed_at') else "✗ Not Verified",
                color="success" if data.get('email_confirmed_at') else "warning",
                className="ms-2"
            )],  # email verified
            [dbc.Badge(
                "✓ Verified" if data.get('phone_confirmed_at') else "✗ Not Verified",
                color="success" if data.get('phone_confirmed_at') else "secondary",
                className="ms-2"
            )],  # phone verified
            [dbc.Badge(
                "Yes" if data.get('is_anonymous') else "No",
                color="warning" if data.get('is_anonymous') else "success",
                className="ms-2"
            )],  # anonymous
            data.get('app_metadata', {}).get('provider', 'N/A').title(),  # provider
            format_date(data.get('created_at')),  # created
            format_date(data.get('updated_at')),  # updated
            format_date(data.get('last_sign_in_at')),  # signin
            format_date(data.get('email_confirmed_at'))  # email confirmed
        )
        
    except Exception as e:
        print(f"Error displaying profile data: {e}")
        error_msg = f"Error: {str(e)}"
        return ([error_msg] * 11)