from typing import Tuple, Dict, Any, Optional
from helper.api_client import api_request


def get_accounts(access_token: str, refresh_token: str, account_id: Optional[str] = None) -> Tuple[Dict[str, Any], str, str]:
    """
    Fetch accounts data with optional filtering by account ID and automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        account_id: Optional account ID for filtering
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    params = {}
    if account_id:
        params["account_id"] = account_id
    
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/accounts/',
            access_token=access_token,
            refresh_token=refresh_token,
            params=params
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error fetching accounts data: {e}")
        raise RuntimeError(f"Failed to fetch accounts data from the backend: {str(e)}")


def create_account(access_token: str, refresh_token: str, payload: dict) -> Tuple[Dict[str, Any], str, str]:
    """
    Create a new account via POST request with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        payload: Account data to create
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='POST',
            endpoint='/accounts/',
            access_token=access_token,
            refresh_token=refresh_token,
            data=payload
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error creating account: {e}")
        raise RuntimeError(f"Failed to create account: {str(e)}")


def update_account(access_token: str, refresh_token: str, account_id: str, payload: dict) -> Tuple[Dict[str, Any], str, str]:
    """
    Update an existing account via PUT request with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        account_id: ID of the account to update
        payload: Updated account data
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='PUT',
            endpoint=f'/accounts/{account_id}',
            access_token=access_token,
            refresh_token=refresh_token,
            data=payload
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error updating account: {e}")
        raise RuntimeError(f"Failed to update account: {str(e)}")


def delete_account(access_token: str, refresh_token: str, account_id: str) -> Tuple[Dict[str, Any], str, str]:
    """
    Delete an account via DELETE request with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        account_id: ID of the account to delete
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='DELETE',
            endpoint=f'/accounts/{account_id}',
            access_token=access_token,
            refresh_token=refresh_token
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error deleting account: {e}")
        raise RuntimeError(f"Failed to delete account: {str(e)}")

