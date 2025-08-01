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
    
    ID = "id"
    USER_ID = "user_id"
    NAME = "name"
    TYPE = "type"
    STARTING_BALANCE = "starting_balance"
    CURRENCY = "currency"
    CREATED_AT = "created_at"

    def __str__(self):
        return self.value
    

class CATEGORIES_COLUMNS(Enum):

    ID = "id"
    NAME = "name"
    TYPE = "type"
    IS_ACTIVE = "is_active"
    CREATED_AT = "created_at"
    CATEGORY_CATEGORY = "category_category"
    SPENDING_TYPE = "spending_type"

    def __str__(self):
        return self.value