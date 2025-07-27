import requests
import helper.environment as env

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY


def get_accounts(access_token: str, account_id: str | None = None) -> dict:
    """Fetch accounts data with optional filtering by account ID."""
    url = f"{BACKEND_URL}/accounts/"
    params = {}
    if account_id:
        params["account_id"] = account_id
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()
    return response.json()


def create_account(access_token: str, payload: dict) -> dict:
    """Create a new account via POST request."""

    url = f"{BACKEND_URL}/accounts/"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
        "Content-Type": "application/json",
    }
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
    except Exception as e:
        return {"success": False, "message": f"Error creating account: {e}"}

    if response.status_code != 201:
        error_message = response.json().get("detail", "Unknown error")
        return {"success": False, "message": f"Failed to add account: {error_message}"}

    return {"success": True, "message": "Account added"}


def update_account(access_token: str, account_id: str, payload: dict) -> dict:
    """Update an existing account via PUT request."""

    url = f"{BACKEND_URL}/accounts/{account_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
        "Content-Type": "application/json",
    }
    try:
        response = requests.put(url, headers=headers, json=payload)
        response.raise_for_status()
    except Exception as e:
        return {"success": False, "message": f"Error updating account: {e}"}

    return {"success": True, "message": "Account updated"}


def delete_account(access_token: str, account_id: str) -> dict:
    """Delete an account via DELETE request."""

    url = f"{BACKEND_URL}/accounts/{account_id}"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "X-API-KEY": BACKEND_API_KEY,
    }
    try:
        response = requests.delete(url, headers=headers)
        response.raise_for_status()
    except Exception as e:
        return {"success": False, "message": f"Error deleting account: {e}"}

    return {"success": True, "message": "Account deleted"}

