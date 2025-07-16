# =============================================================================
# DATA MANAGER
# =============================================================================
# Centralized data management for all dashboard stores

from dash import Input, Output, State, callback, no_update
from helper.requests.profile_request import request_profile_data


@callback(
    [Output('profile-store', 'data'),  # Removed allow_duplicate to prevent conflicts
     Output('categories-store', 'data'),  # Future: categories data
     Output('accounts-store', 'data')],   # Future: accounts data
    [Input('token-store', 'data')],  # Only trigger on token changes (more stable)
    [State('auth-store', 'data'),
     State('profile-store', 'data'),
     State('categories-store', 'data'),
     State('accounts-store', 'data')],
    prevent_initial_call=True
)
def manage_data_stores(token_data, auth_data, current_profile, current_categories, current_accounts):
    """
    Centralized data management for all dashboard stores
    Loads data when:
    1. User logs in successfully
    2. Page reloads with valid auth/token
    3. Token refreshes
    """
    
    print(f"Data manager triggered - Auth: {auth_data}, Token: {bool(token_data and token_data.get('access_token'))}")
    print(f"Current profile data: {bool(current_profile and current_profile.get('data'))}")
    
    # Initialize return values with current data 
    profile_data = current_profile or {}
    categories_data = current_categories or {}  
    accounts_data = current_accounts or {}
    
    # Check if we have valid authentication
    if not (auth_data and auth_data.get('logged') and token_data and token_data.get('access_token')):
        # User is not logged in - clear all data
        print("No valid auth/token - clearing data")
        return {}, {}, {}
    
    access_token = token_data['access_token']
    
    # Load profile data if not already loaded
    if not current_profile or not current_profile.get('data'):
        print("Loading profile data...")
        try:
            profile_response = request_profile_data(access_token)
            print(f"Profile response structure: {profile_response}")
            if profile_response and not profile_response.get('error'):
                profile_data = profile_response
                print("Profile data loaded successfully by data manager")
            else:
                print(f"Profile data error: {profile_response}")
                profile_data = {}
        except Exception as e:
            print(f"Error loading profile data: {e}")
            profile_data = {}
    else:
        print("Profile data already loaded, skipping...")
        # Keep existing data
        profile_data = current_profile
    
    # Future: Load categories data if not already loaded
    # if not current_categories or not current_categories.get('data'):
    #     try:
    #         categories_response = request_categories_data(access_token)
    #         if categories_response and not categories_response.get('error'):
    #             categories_data = categories_response
    #     except Exception as e:
    #         print(f"Error loading categories data: {e}")
    #         categories_data = {}
    
    # Future: Load accounts data if not already loaded  
    # if not current_accounts or not current_accounts.get('data'):
    #     try:
    #         accounts_response = request_accounts_data(access_token)
    #         if accounts_response and not accounts_response.get('error'):
    #             accounts_data = accounts_response
    #     except Exception as e:
    #         print(f"Error loading accounts data: {e}")
    #         accounts_data = {}
    
    return profile_data, categories_data, accounts_data


@callback(
    Output('data-loading-indicator', 'children'),
    [Input('profile-store', 'data'),
     Input('categories-store', 'data'), 
     Input('accounts-store', 'data')],
    prevent_initial_call=True
)
def update_loading_status(profile_data, categories_data, accounts_data):
    """
    Optional: Show loading status for all data stores
    This can be used to display a global loading indicator
    """
    
    loaded_stores = []
    if profile_data and profile_data.get('data'):
        loaded_stores.append('Profile')
    if categories_data and categories_data.get('data'):
        loaded_stores.append('Categories') 
    if accounts_data and accounts_data.get('data'):
        loaded_stores.append('Accounts')
    
    if loaded_stores:
        return f"Loaded: {', '.join(loaded_stores)}"
    else:
        return "Loading user data..."


# =============================================================================
# UTILITY FUNCTIONS FOR OTHER COMPONENTS
# =============================================================================

def check_data_availability(store_data, data_key='data'):
    """
    Utility function to check if store data is available
    Usage: if check_data_availability(profile_store_data): ...
    """
    return store_data and store_data.get(data_key) is not None


def get_store_data(store_data, data_key='data', fallback=None):
    """
    Safely extract data from store with fallback
    Usage: user_email = get_store_data(profile_store, 'data', {}).get('email', 'N/A')
    """
    if check_data_availability(store_data, data_key):
        return store_data[data_key]
    return fallback or {}
