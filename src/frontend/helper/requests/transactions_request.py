import requests
import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY


def get_transactions(access_token: str, offset: int = 0, limit: int = 100, transaction_id: str | None = None) -> dict:
    """Fetch transactions with optional pagination or by specific ID."""
    url = f"{BACKEND_URL}/transactions/"
    params = {
        "offset": offset,
        "limit": limit,
    }
    if transaction_id:
        params["transaction_id"] = transaction_id
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()

def get_accounts(access_token: str) -> dict:
    """Fetch accounts for the current user"""
    url = f"{BACKEND_URL}/accounts/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching accounts: {e}")
        return {"data": [], "count": 0}


def get_categories(access_token: str) -> dict:
    """Fetch categories for the current user"""
    url = f"{BACKEND_URL}/categories/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return {"data": [], "count": 0}


def create_transaction(access_token: str, payload: dict) -> dict:
    """Dummy request for creating a transaction."""
    
    url = f"{BACKEND_URL}/transactions/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
        "Content-Type": "application/json",
    }
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()

    except Exception as e:
        return {
            "success": False,
            "message": f"Error creating transaction: {e}",
        }

    if response.status_code != 201:
        error_message = response.json().get("detail", "Unknown error")
        return {
            "success": False,
            "message": f"Failed to add transaction: {error_message}",
        }

    return {
        "success": True,
        "message": "Transaction added",
    }


def update_transaction(access_token: str, transaction_id: str, payload: dict) -> dict:
    """Update an existing transaction via PUT request."""

    url = f"{BACKEND_URL}/transactions/{transaction_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
        "Content-Type": "application/json",
    }
    try:
        response = requests.put(url, headers=headers, json=payload)
        response.raise_for_status()
    except Exception as e:
        return {"success": False, "message": f"Error updating transaction: {e}"}

    return {"success": True, "message": "Transaction updated"}


def delete_transaction(access_token: str, transaction_id: str) -> dict:
    """Delete a transaction via DELETE request."""

    url = f"{BACKEND_URL}/transactions/{transaction_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    try:
        response = requests.delete(url, headers=headers)
        response.raise_for_status()
    except Exception as e:
        return {"success": False, "message": f"Error deleting transaction: {e}"}

    return {"success": True, "message": "Transaction deleted"}