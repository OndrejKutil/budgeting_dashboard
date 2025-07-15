from dash import html, dcc, Input, State, Output, callback
from utils.theme import COLORS, CARD_STYLE
from helper.requests.profile_request import request_profile_data


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
        # Add your profile content here
        html.Div(id="profile-content")
    ], style=content_card_style)



# Callbacks for profile tab interactions
@callback(
    Output("profile-content", "children"),
    [Input('dashboard-tabs', 'value'),
     Input('token-store', 'data')] # Trigger on both tab change AND token data change
)
def update_profile_content(current_tab, token_data):
    
    # Only update if profile tab is currently selected
    if current_tab != 'profile':
        return html.Div()  # Return empty div if not on profile tab
    
    if not token_data or not token_data.get('access_token'):
        return html.Div("No user data available")

    try:
        user_profile = request_profile_data(token_data['access_token'])
        print(f"Profile data received: {user_profile}")
        
        # Your profile content here
        return html.Div([
            html.H3("User Information"),
            html.P(f"Email: {token_data.get('email', 'N/A')}"),
            html.P(f"User ID: {token_data.get('user', 'N/A')}"),
            html.Hr(),
            html.H4("Profile Data from API:"),
            html.Pre(str(user_profile))  # Display the API response
        ])
        
    except Exception as e:
        print(f"Error fetching profile data: {e}")
        return html.Div([
            html.P("Error loading profile data"),
            html.P(f"Error: {str(e)}")
        ])