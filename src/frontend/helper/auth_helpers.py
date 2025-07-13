# =============================================================================
# AUTHENTICATION HELPERS
# =============================================================================
# Helper functions for authentication and validation

def is_user_authenticated(auth_data):
    """
    Check if user is authenticated based on auth store data
    
    Args:
        auth_data (dict): Authentication data from the store
        
    Returns:
        bool: True if user is authenticated, False otherwise
    """
    if not auth_data:
        return False
    
    # Check if logged is True and both email and password exist
    return (
        True if auth_data.get('logged') else False
    )