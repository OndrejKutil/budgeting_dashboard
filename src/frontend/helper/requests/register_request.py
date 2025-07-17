import requests
import json
from typing import Dict, Any
import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL")
BACKEND_API_KEY = os.getenv("BACKEND_API_KEY")


def register_user(email: str, password: str, full_name: str = None) -> Dict[str, Any]:
    """
    Register a new user account.
    
    Args:
        email (str): User's email address
        password (str): User's password
        full_name (str, optional): User's full name
        
    Returns:
        Dict[str, Any]: Registration response with success status and message
    """
    
    try:
        # Prepare registration data
        headers = {
            "X-Login": f"{email}&&&{password}&&&{full_name or 'None'}",
        }
        
        
        if BACKEND_API_KEY:
            headers["X-API-Key"] = BACKEND_API_KEY
        
        registration_url = f"{BACKEND_URL}/auth/register"
        
        # Make the registration request
        response = requests.post(
            registration_url,
            headers=headers,
            timeout=10  # 10 second timeout
        )
        
        # Parse response
        if response.status_code == 201:  # Created
            # Registration successful
            return {
                "success": True,
                "message": "Account created successfully",
                "data": response.json()
            }
        elif response.status_code == 400:
            # Bad request (validation errors, email already exists, etc.)
            error_data = response.json()
            return {
                "success": False,
                "message": error_data.get("detail", "Registration failed"),
                "errors": error_data
            }
        else:
            # Other error
            return {
                "success": False,
                "message": f"Registration failed: {response.status_code}"
            }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"An unexpected error occurred: {str(e)}"
        }