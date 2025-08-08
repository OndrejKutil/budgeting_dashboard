import requests
from typing import Dict, Any, Optional, Tuple
import helper.environment as env
from helper.requests.refresh_request import refresh_token as refresh_token_request

BACKEND_URL = env.BACKEND_URL
BACKEND_API_KEY = env.BACKEND_API_KEY


class APIClient:
    """
    Stateless API client that handles automatic token refresh on 498 responses.
    """
    
    @staticmethod
    def make_request(
        method: str,
        endpoint: str,
        access_token: str,
        refresh_token: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        additional_headers: Optional[Dict[str, str]] = None
    ) -> Tuple[Dict[str, Any], str, str]:
        """
        Make an API request with automatic token refresh on 498 responses.
        
        Args:
            method: HTTP method ('GET', 'POST', 'PUT', 'DELETE', etc.)
            endpoint: API endpoint (e.g., '/summary/', '/accounts/')
            access_token: Current access token
            refresh_token: Current refresh token
            data: JSON payload for request body (for POST/PUT requests)
            params: Query parameters
            additional_headers: Any additional headers beyond Authorization and X-API-KEY
            
        Returns:
            Tuple of (response_data, new_access_token, new_refresh_token)
            
        Raises:
            Exception: If request fails after token refresh attempt
        """
        
        # Prepare base headers
        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-API-KEY": BACKEND_API_KEY
        }
        
        # Add additional headers if provided
        if additional_headers:
            headers.update(additional_headers)
        
        # Add Content-Type for requests with data
        if data is not None:
            headers["Content-Type"] = "application/json"
        
        # Construct full URL
        url = f"{BACKEND_URL}{endpoint}"
        
        # First attempt with current token
        try:
            response = APIClient._make_http_request(method, url, headers, data, params)
            
            # If successful, return with current tokens
            if response.status_code < 400:
                return response.json(), access_token, refresh_token
            
            # If 498 (token expired), try to refresh and retry
            elif response.status_code == 498:
                print("Access token expired (498), attempting to refresh...")
                
                # Check if we have a refresh token
                if not refresh_token:
                    raise Exception("No refresh token available for token refresh")
                
                # Refresh the token
                try:
                    token_data = refresh_token_request(refresh_token)
                    new_access_token = token_data['access_token']
                    new_refresh_token = token_data['refresh_token']
                    
                    # Update headers with new token
                    headers["Authorization"] = f"Bearer {new_access_token}"
                    
                    # Retry the request with new token
                    retry_response = APIClient._make_http_request(method, url, headers, data, params)
                    retry_response.raise_for_status()
                    
                    return retry_response.json(), new_access_token, new_refresh_token
                    
                except Exception as refresh_error:
                    raise Exception(f"Token refresh failed: {refresh_error}")
            
            else:
                # Other HTTP errors
                response.raise_for_status()
                
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {e}")
    
    @staticmethod
    def _make_http_request(
        method: str, 
        url: str, 
        headers: Dict[str, str], 
        data: Optional[Dict[str, Any]], 
        params: Optional[Dict[str, Any]]
    ) -> requests.Response:
        """Make the actual HTTP request."""
        
        method = method.upper()
        
        if method == 'GET':
            return requests.get(url, headers=headers, params=params)
        elif method == 'POST':
            return requests.post(url, headers=headers, json=data, params=params)
        elif method == 'PUT':
            return requests.put(url, headers=headers, json=data, params=params)
        elif method == 'DELETE':
            return requests.delete(url, headers=headers, params=params)
        elif method == 'PATCH':
            return requests.patch(url, headers=headers, json=data, params=params)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")


# Convenience function for easier usage
def api_request(
    method: str,
    endpoint: str,
    access_token: str,
    refresh_token: str,
    data: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
    additional_headers: Optional[Dict[str, str]] = None
) -> Tuple[Dict[str, Any], str, str]:
    """
    Convenience function that wraps APIClient.make_request for easier usage.
    
    Returns:
        Tuple of (response_data, new_access_token, new_refresh_token)
    """
    return APIClient.make_request(
        method=method,
        endpoint=endpoint,
        access_token=access_token,
        refresh_token=refresh_token,
        data=data,
        params=params,
        additional_headers=additional_headers
    )
