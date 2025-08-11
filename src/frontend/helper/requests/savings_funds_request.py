import datetime
from typing import Tuple, Dict, Any
from helper.api_client import api_request


def get_savings_funds(access_token: str, refresh_token: str) -> Tuple[dict, str, str]:
    """
    Get the list of savings funds.

    Args:
        access_token (str): The access token.
        refresh_token (str): The refresh token.

    Returns:
        Tuple[Dict[str, Any], str, str]: A tuple containing the savings funds data, new access token, and new refresh token.
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='GET',
            endpoint='/funds/',
            access_token=access_token,
            refresh_token=refresh_token
        )
    
        return response_data, new_access_token, new_refresh_token
    
    except Exception as e:
        print(f"Error fetching savings funds data: {e}")
        raise RuntimeError(f"Failed to fetch savings funds data from the backend: {str(e)}")

def update_savings_fund(access_token: str, refresh_token: str, fund_id: str, data: dict) -> Tuple[dict, str, str]:
    """
    Update a savings fund.

    Args:
        access_token (str): The access token.
        refresh_token (str): The refresh token.
        fund_id (str): The ID of the fund to update.
        data (dict): The updated fund data.

    Returns:
        Tuple[Dict[str, Any], str, str]: A tuple containing the updated fund data, new access token, and new refresh token.
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='PUT',
            endpoint=f'/funds/{fund_id}',
            access_token=access_token,
            refresh_token=refresh_token,
            json=data
        )

        return response_data, new_access_token, new_refresh_token

    except Exception as e:
        print(f"Error updating savings fund data: {e}")
        raise RuntimeError(f"Failed to update savings fund data from the backend: {str(e)}")
    

def post_savings_fund(access_token: str, refresh_token: str, data: dict) -> Tuple[dict, str, str]:
    """
    Create a new savings fund.

    Args:
        access_token (str): The access token.
        refresh_token (str): The refresh token.
        data (dict): The new fund data.

    Returns:
        Tuple[Dict[str, Any], str, str]: A tuple containing the created fund data, new access token, and new refresh token.
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='POST',
            endpoint='/funds/',
            access_token=access_token,
            refresh_token=refresh_token,
            json=data
        )

        return response_data, new_access_token, new_refresh_token

    except Exception as e:
        print(f"Error creating savings fund data: {e}")
        raise RuntimeError(f"Failed to create savings fund data from the backend: {str(e)}")
    

def delete_savings_fund(access_token: str, refresh_token: str, fund_id: str) -> Tuple[dict, str, str]:
    """
    Delete a savings fund.

    Args:
        access_token (str): The access token.
        refresh_token (str): The refresh token.
        fund_id (str): The ID of the fund to delete.

    Returns:
        Tuple[Dict[str, Any], str, str]: A tuple containing the response data, new access token, and new refresh token.
    """
    try:
        response_data, new_access_token, new_refresh_token = api_request(
            method='DELETE',
            endpoint=f'/funds/{fund_id}',
            access_token=access_token,
            refresh_token=refresh_token
        )

        return response_data, new_access_token, new_refresh_token

    except Exception as e:
        print(f"Error deleting savings fund data: {e}")
        raise RuntimeError(f"Failed to delete savings fund data from the backend: {str(e)}")