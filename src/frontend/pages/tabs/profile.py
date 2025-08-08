from dash import html, dcc, Input, State, Output, callback
import dash_bootstrap_components as dbc

from datetime import datetime
from helper.requests.profile_request import request_profile_data
from utils.currency import CURRENCY_OPTIONS

#TODO: Implement the new api_client for this profile page and the profile_request

def create_profile_tab():
    """Create the profile tab content"""
    
    content = html.Div([
        html.Div([
            html.H1("Profile Settings", className="text-primary", style={'margin': '0', 'flex': '1'})
        ], className='flex-between mb-20'),
        
        # Profile content with placeholder structure
        html.Div([
            # Basic Information Card
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Basic Information", className="mb-0 text-primary")
                ]),
                dcc.Loading(
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Email:", className='text-primary'),
                            html.P(id="profile-email", children='', className="mb-2 text-secondary")
                        ], width=6),
                        dbc.Col([
                            html.Strong("Role:", className='text-primary'),
                            html.P(id="profile-role", children='', className="mb-2 text-secondary")
                        ], width=6),
                    ]),
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Phone:", className='text-primary'),
                            html.P(id="profile-phone", children='', className="mb-2 text-secondary")
                        ], width=6),
                        dbc.Col([
                            html.Strong("Currency:", className='text-primary'),
                            dcc.Dropdown(
                                id="profile-currency",
                                options=[
                                    {"label": html.Span(label), "value": value}
                                    for label, value in CURRENCY_OPTIONS
                                ],
                                value="CZK",
                                clearable=False,
                                style={'width': '220px', 'paddingLeft': '10px'},
                                className="profile-currency-dropdown"
                            )
                        ], width=3, style={'display': 'flex', 'alignItems': 'center'}),
                    ])
                ]), className='loading loading-none')
            ], className="mb-3"),
            # Account Status Card
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Account Status", className="mb-0 text-primary")
                ]),
                dcc.Loading(
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Email Verified:", className='text-primary'),
                            html.P(id="profile-email-verified", children=[
                                dbc.Badge('', color="secondary", className="ms-2")
                            ], className="mb-2")
                        ], width=6),
                        dbc.Col([
                            html.Strong("Phone Verified:", className='text-primary'),
                            html.P(id="profile-phone-verified", children=[
                                dbc.Badge('', color="secondary", className="ms-2")
                            ], className="mb-2")
                        ], width=6),
                    ]),
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Anonymous User:", className='text-primary'),
                            html.P(id="profile-anonymous", children=[
                                dbc.Badge('', color="secondary", className="ms-2")
                            ], className="mb-2")
                        ], width=6),
                        dbc.Col([
                            html.Strong("Provider:", className='text-primary'),
                            html.P(id="profile-provider", children='', className="mb-2 text-secondary")
                        ], width=6),
                    ])
                ]), className='loading loading-none')
            ], className="mb-3"),
            
            # Account Timeline Card
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Account Timeline", className="mb-0 text-primary")
                ]),
                dcc.Loading(
                dbc.CardBody([
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Account Created:", className='text-primary'),
                            html.P(id="profile-created", children='', className="mb-2 text-secondary")
                        ], width=6),
                        dbc.Col([
                            html.Strong("Last Updated:", className='text-primary'),
                            html.P(id="profile-updated", children='', className="mb-2 text-secondary")
                        ], width=6),
                    ]),
                    dbc.Row([
                        dbc.Col([
                            html.Strong("Last Sign In:", className='text-primary'),
                            html.P(id="profile-signin", children='', className="mb-2 text-secondary")
                        ], width=6),
                        dbc.Col([
                            html.Strong("Email Confirmed:", className='text-primary'),
                            html.P(id="profile-email-confirmed", children='', className="mb-2 text-secondary")
                        ], width=6),
                    ])
                ]), className='loading loading-none')
            ], className="mb-3"),
            
            # Account Actions Card
            dbc.Card([
                dbc.CardHeader([
                    html.H4("Account Actions", className="mb-0 text-primary")
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
            ])
        ])
    ], className='tab-content')

    return content


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
    [Input('navigation-store', 'data')],
    [State('token-store', 'data')]
)
def update_profile_content(nav_data, token_store):

    # Only update if profile tab is currently selected
    current_tab = nav_data.get('active_tab', 'overview') if nav_data else 'overview'
    if current_tab != 'profile':
        return ([''] * 11)  # Return loading for all fields

    if not token_store or not token_store.get('access_token'):
        # If no token available, show no data message
        return (["No data"] * 11)

    try:
        response = request_profile_data(token_store['access_token'])
        
        if not response or 'data' not in response:
            raise ValueError("Invalid profile data format")
            
        data = response['data']

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
        print(f"Error fetching profile data: {e}")
        return (["--- Error ---"] * 11)

# Callback to update user settings store with selected currency
@callback(
    Output('user-settings-store', 'data'),
    Input('profile-currency', 'value'),
    State('user-settings-store', 'data'),
    prevent_initial_call=True
)
def update_user_settings_currency(selected_currency, current_settings):
    """Update the user settings store with the selected currency from the profile tab."""
    if not current_settings:
        current_settings = {}
    current_settings['currency'] = selected_currency
    return current_settings