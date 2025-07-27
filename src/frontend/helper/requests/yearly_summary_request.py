# This file is deprecated - use yearly_analytics_request.py instead
from helper.requests.yearly_analytics_request import get_yearly_analytics

def get_yearly_summary(access_token: str, year: int = None) -> dict:
    """Legacy function - redirects to new yearly analytics endpoint"""
    return get_yearly_analytics(access_token, year)