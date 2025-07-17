# =============================================================================
# LOGIN PAGE
# =============================================================================
# Login page component with authentication form

from dash import html, Input, Output, callback, State, dcc

from pages.login_tabs.login_tab import create_login_tab_layout
from pages.login_tabs.forgot_pass_tab import create_forgot_password_tab_layout
from pages.login_tabs.register_tab import create_register_tab_layout
from pages.login_tabs.PP_tab import create_privacy_policy_tab_layout
from pages.login_tabs.ToS_tab import create_terms_of_service_tab_layout

# =============================================================================
# LAYOUT
# =============================================================================

def create_login_layout():
    layout = html.Div([

        # Store to manage active tab state
        dcc.Store(
            id='login-tab-store',
            data={'active_tab': 'login'},
            storage_type='session'
        ),

        # Main container for the content
        html.Div(id='login-page-content')

    ])

    return layout

# =============================================================================
# Login tabs callbacks
# =============================================================================

@callback(
    Output('login-page-content', 'children'),
    Input('login-tab-store', 'data')
)
def update_login_page_content(store_data):
    """Update the login page content based on the active tab"""
    if not store_data:
        store_data = {'active_tab': 'login'}
    
    active_tab = store_data.get('active_tab', 'login')
    
    if active_tab == 'login':
        return create_login_tab_layout()
    elif active_tab == 'register':
        return create_register_tab_layout()
    elif active_tab == 'forgot_password':
        return create_forgot_password_tab_layout()
    elif active_tab == 'privacy_policy':
        return create_privacy_policy_tab_layout()
    elif active_tab == 'terms_of_service':
        return create_terms_of_service_tab_layout()
    else:
        # Default to login tab
        return create_login_tab_layout()



# =============================================================================
# CALLBACKS
# =============================================================================


# Additional callback to hide alert when user starts typing
@callback(
    Output('login-error-alert', 'is_open', allow_duplicate=True),
    [Input('email-input', 'value'),
     Input('password-input', 'value')],
    prevent_initial_call=True
)
def hide_alert_on_input(email, password):
    """Hide error alert when user starts typing"""
    return False


# Callback to preload data after successful login
@callback(
     Output('overview-store', 'data'),
    Input('auth-store', 'data'),
    State('token-store', 'data'),
    prevent_initial_call=True
)
def preload_all_data(auth_data, token_data):
    """Preload all data stores immediately after successful login"""
    
    if auth_data and auth_data.get('logged') and token_data and token_data.get('access_token'):
        access_token = token_data['access_token']
        
        overview_data = {}
        
        try:
            # Preload overview data
            from helper.requests.overview_request import get_overview
            overview_response = get_overview(access_token)
            if overview_response and not overview_response.get('error'):
                overview_data = overview_response
        except Exception as e:
            print(f"Error preloading overview data: {e}")
        
        #? Add more store preloading here as needed
        # try:
        #     # Preload transactions data
        #     from helper.requests.transactions_request import get_transactions
        #     transactions_response = get_transactions(access_token)
        #     if transactions_response and not transactions_response.get('error'):
        #         transactions_data = transactions_response
        # except Exception as e:
        #     print(f"Error preloading transactions data: {e}")
        
        return overview_data
    
    # Return empty data if login failed or no token
    return {}
