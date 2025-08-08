from typing import Tuple, Dict, Any, Optional
from helper.api_client import api_request


def get_transactions(access_token: str, refresh_token: str, offset: int = 0, limit: int = 100, transaction_id: Optional[str] = None) -> Tuple[Dict[str, Any], str, str]:
    """
    Fetch transactions with optional pagination or by specific ID and automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        offset: Pagination offset
        limit: Number of items to fetch
        transaction_id: Optional specific transaction ID
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    params = {
        "offset": offset,
        "limit": limit,
    }
    if transaction_id:
        params["transaction_id"] = transaction_id
    
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/transactions/',
            access_token=access_token,
            refresh_token=refresh_token,
            params=params
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error fetching transactions: {e}")
        raise RuntimeError(f"Failed to fetch transactions from the backend: {str(e)}")


def get_accounts(access_token: str, refresh_token: str) -> Tuple[Dict[str, Any], str, str]:
    """
    Fetch accounts for the current user with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/accounts/',
            access_token=access_token,
            refresh_token=refresh_token
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error fetching accounts: {e}")
        return {"data": [], "count": 0}, access_token, refresh_token


def get_categories(access_token: str, refresh_token: str) -> Tuple[Dict[str, Any], str, str]:
    """
    Fetch categories for the current user with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/categories/',
            access_token=access_token,
            refresh_token=refresh_token
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return {"data": [], "count": 0}, access_token, refresh_token


def create_transaction(access_token: str, refresh_token: str, payload: dict) -> Tuple[Dict[str, Any], str, str]:
    """
    Create a transaction with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        payload: Transaction data to create
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='POST',
            endpoint='/transactions/',
            access_token=access_token,
            refresh_token=refresh_token,
            data=payload
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error creating transaction: {e}")
        raise RuntimeError(f"Failed to create transaction: {str(e)}")


def update_transaction(access_token: str, refresh_token: str, transaction_id: str, payload: dict) -> Tuple[Dict[str, Any], str, str]:
    """
    Update an existing transaction via PUT request with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        transaction_id: ID of the transaction to update
        payload: Updated transaction data
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='PUT',
            endpoint=f'/transactions/{transaction_id}',
            access_token=access_token,
            refresh_token=refresh_token,
            data=payload
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error updating transaction: {e}")
        raise RuntimeError(f"Failed to update transaction: {str(e)}")


def delete_transaction(access_token: str, refresh_token: str, transaction_id: str) -> Tuple[Dict[str, Any], str, str]:
    """
    Delete a transaction via DELETE request with automatic token refresh.
    
    Args:
        access_token: Current access token
        refresh_token: Current refresh token
        transaction_id: ID of the transaction to delete
        
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='DELETE',
            endpoint=f'/transactions/{transaction_id}',
            access_token=access_token,
            refresh_token=refresh_token
        )
        
        return response_data, new_access_token, new_refresh_token
        
    except Exception as e:
        print(f"Error deleting transaction: {e}")
        raise RuntimeError(f"Failed to delete transaction: {str(e)}")