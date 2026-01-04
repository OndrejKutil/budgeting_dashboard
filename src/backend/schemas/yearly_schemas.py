from pydantic import BaseModel, Field
from typing import List, Dict, Optional


class YearlyAnalyticsData(BaseModel):
    """Schema for yearly analytics data"""
    year: int = Field(..., description="Year of the analytics")
    total_income: float = Field(..., description="Total income for the year")
    total_expense: float = Field(..., description="Total expenses for the year")
    total_saving: float = Field(..., description="Total savings for the year")
    total_investment: float = Field(..., description="Total investments for the year")
    total_core_expense: float = Field(..., description="Total core expenses for the year")
    total_fun_expense: float = Field(..., description="Total fun expenses for the year")
    total_future_expense: float = Field(..., description="Total future expenses for the year")
    profit: float = Field(..., description="Profit (income - expenses)")
    net_cash_flow: float = Field(..., description="Net cash flow")
    savings_rate: float = Field(..., description="Savings rate as percentage of income")
    investment_rate: float = Field(..., description="Investment rate as percentage of income")
    months: List[str] = Field(..., description="Month names")
    monthly_income: List[float] = Field(..., description="Monthly income amounts")
    monthly_expense: List[float] = Field(..., description="Monthly expense amounts")
    monthly_saving: List[float] = Field(..., description="Monthly saving amounts")
    monthly_investment: List[float] = Field(..., description="Monthly investment amounts")
    monthly_core_expense: List[float] = Field(..., description="Monthly core expense amounts")
    monthly_fun_expense: List[float] = Field(..., description="Monthly fun expense amounts")
    monthly_future_expense: List[float] = Field(..., description="Monthly future expense amounts")
    monthly_savings_rate: List[float] = Field(..., description="Monthly savings rate percentages")
    monthly_investment_rate: List[float] = Field(..., description="Monthly investment rate percentages")
    by_category: Dict[str, float] = Field(..., description="Breakdown by category")
    core_categories: Dict[str, float] = Field(..., description="Core category breakdown")
    income_by_category: Dict[str, float] = Field(..., description="Income breakdown by category")
    expense_by_category: Dict[str, float] = Field(..., description="Expense breakdown by category")

    class Config:
        json_schema_extra = {
            "example": {
                "year": 2024,
                "total_income": 60000.00,
                "total_expense": 45000.00,
                "total_saving": 10000.00,
                "total_investment": 5000.00,
                "total_core_expense": 30000.00,
                "total_fun_expense": 15000.00,
                "total_future_expense": 5000.00,
                "profit": 15000.00,
                "net_cash_flow": 0.00,
                "savings_rate": 16.67,
                "investment_rate": 8.33,
                "months": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                "monthly_income": [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
                "monthly_expense": [3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750, 3750],
                "monthly_saving": [833, 833, 833, 833, 833, 833, 833, 833, 833, 833, 833, 833],
                "monthly_investment": [417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417],
                "monthly_core_expense": [2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500],
                "monthly_fun_expense": [1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250, 1250],
                "monthly_future_expense": [417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417, 417],
                "monthly_savings_rate": [16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67, 16.67],
                "monthly_investment_rate": [8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33, 8.33],
                "by_category": {
                    "Salary": 60000.00,
                    "Rent": -18000.00,
                    "Groceries": -12000.00
                },
                "core_categories": {
                    "Rent": 18000.00,
                    "Groceries": 12000.00
                },
                "income_by_category": {
                    "Salary": 60000.00
                },
                "expense_by_category": {
                    "Rent": 18000.00,
                    "Groceries": 12000.00
                }
            }
        }


class YearlyAnalyticsResponse(BaseModel):
    """Response schema for yearly analytics endpoint"""
    data: YearlyAnalyticsData = Field(..., description="Yearly analytics data")
    success: bool = Field(..., description="Indicates if the request was successful")
    message: str = Field(..., description="Response message")


class EmergencyFundData(BaseModel):
    """Schema for emergency fund analysis data"""
    year: int = Field(..., description="Year of the analysis")
    average_monthly_core_expenses: float = Field(..., description="Average monthly core expenses")
    total_core_expenses: float = Field(..., description="Total core expenses for the year")
    three_month_fund_target: float = Field(..., description="Target amount for 3-month emergency fund")
    six_month_fund_target: float = Field(..., description="Target amount for 6-month emergency fund")
    core_category_breakdown: Dict[str, float] = Field(..., description="Breakdown of core expenses by category")
    months_analyzed: int = Field(..., description="Number of months with data")

    class Config:
        json_schema_extra = {
            "example": {
                "year": 2024,
                "average_monthly_core_expenses": 2500.00,
                "total_core_expenses": 30000.00,
                "three_month_fund_target": 7500.00,
                "six_month_fund_target": 15000.00,
                "core_category_breakdown": {
                    "Rent": 18000.00,
                    "Groceries": 8000.00,
                    "Utilities": 4000.00
                },
                "months_analyzed": 12
            }
        }


class EmergencyFundResponse(BaseModel):
    """Response schema for emergency fund analysis endpoint"""
    data: EmergencyFundData = Field(..., description="Emergency fund analysis data")