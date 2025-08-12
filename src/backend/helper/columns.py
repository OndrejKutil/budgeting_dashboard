from enum import Enum

""" 
Definition of columns used in the database.
"""

class TRANSACTIONS_COLUMNS(Enum):
    
    ID = "id"
    USER_ID = "user_id"
    ACCOUNT_ID = "account_id"
    CATEGORY_ID = "category_id"
    AMOUNT = "amount"
    DATE = "date"
    NOTES = "notes"
    IS_TRANSFER = "is_transfer"
    CREATED_AT = "created_at"

    def __str__(self):
        return self.value
    
class ACCOUNTS_COLUMNS(Enum):
    
    ID = "accounts_id"
    USER_ID = "user_id"
    NAME = "account_name"
    TYPE = "type"
    STARTING_BALANCE = "starting_balance"
    CURRENCY = "currency"
    CREATED_AT = "created_at"

    def __str__(self):
        return self.value
    

class CATEGORIES_COLUMNS(Enum):

    ID = "categories_id"
    NAME = "category_name"
    TYPE = "type"
    IS_ACTIVE = "is_active"
    CREATED_AT = "created_at"
    CATEGORY_CATEGORY = "category_category"
    SPENDING_TYPE = "spending_type"

    def __str__(self):
        return self.value
    

class SAVINGS_FUNDS_COLUMNS(Enum):
    ID = "savings_funds_id"
    USER_ID = "user_id"
    TARGET_AMOUNT = "target_amount"
    NAME = "fund_name"

    def __str__(self):
        return self.value