from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date as Date, datetime
from decimal import Decimal


# ================================================================================================
#                                   Data Schemas
# ================================================================================================

class TransactionData(BaseModel):
    """Schema for individual transaction data"""
    id: Optional[str] = Field(None, description="Transaction ID")
    date: Date = Field(..., description="Transaction date")
    amount: Decimal = Field(..., description="Transaction amount")
    category: str = Field(..., description="Transaction category")
    account: str = Field(..., description="Account name")
    description: Optional[str] = Field(None, description="Transaction description")
    created_at: Optional[datetime] = Field(None, description="Record creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Record update timestamp")
    user_id: Optional[str] = Field(None, description="User ID who owns this transaction")
    
    class Config:
        # Allow Decimal to be serialized as float in JSON
        json_encoders = {
            Decimal: float
        }
        # Example for documentation
        json_schema_extra = {
            "example": {
                "id": "dqn46qd8f8q484q",
                "date": "2025-01-15",
                "amount": 49.99,
                "category": "Groceries",
                "account": "Checking",
                "description": "Weekly grocery shopping",
                "created_at": "2025-01-15T10:30:00Z",
                "updated_at": "2025-01-15T10:30:00Z",
                "user_id": "user123"
            }
        }


# ================================================================================================
#                                   Response Schemas
# ================================================================================================

class AllDataResponse(BaseModel):
    """Response schema for GET /all/ endpoint"""
    data: List[TransactionData] = Field(..., description="List of transaction records")
    count: int = Field(..., description="Total number of records returned")
    user_id: Optional[str] = Field(None, description="User ID of the requesting user")
    
    class Config:
        json_schema_extra = {
            "example": {
                "data": [
                    {
                        "id": 1,
                        "date": "2025-01-15",
                        "amount": 49.99,
                        "category": "Groceries",
                        "account": "Checking",
                        "description": "Weekly grocery shopping",
                        "created_at": "2025-01-15T10:30:00Z",
                        "updated_at": "2025-01-15T10:30:00Z",
                        "user_id": "user123"
                    },
                    {
                        "id": 2,
                        "date": "2025-01-16",
                        "amount": 25.00,
                        "category": "Gas",
                        "account": "Credit Card",
                        "description": "Gas station fill-up",
                        "created_at": "2025-01-16T08:15:00Z",
                        "updated_at": "2025-01-16T08:15:00Z",
                        "user_id": "user123"
                    }
                ],
                "count": 2,
            }
        }


class RefreshTokenResponse(BaseModel):
    """Response schema for token refresh endpoint"""
    user: Optional[dict] = Field(None, description="User information after refresh")
    session: Optional[dict] = Field(None, description="Session information after refresh")


# ================================================================================================
#                                   Error Schemas
# ================================================================================================

# TODO
