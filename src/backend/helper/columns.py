from enum import Enum

""" 
Definition of columns used in the database.
"""

class TRANSACTIONS_COLUMNS(Enum):
    
    ID = "id_pk"
    USER_ID = "user_id_fk"
    ACCOUNT_ID = "account_id_fk"
    CATEGORY_ID = "category_id_fk"
    AMOUNT = "amount"
    DATE = "date"
    NOTES = "notes"
    CREATED_AT = "created_at"
    SAVINGS_FUND_ID = "savings_fund_id_fk"

    def __str__(self):
        return self.value
    
class ACCOUNTS_COLUMNS(Enum):

    ID = "accounts_id_pk"
    USER_ID = "user_id_fk"
    NAME = "account_name"
    TYPE = "type"
    CURRENCY = "currency"
    CREATED_AT = "created_at"

    def __str__(self):
        return self.value
    

class CATEGORIES_COLUMNS(Enum):

    ID = "categories_id_pk"
    NAME = "category_name"
    TYPE = "type"
    IS_ACTIVE = "is_active"
    CREATED_AT = "created_at"
    SPENDING_TYPE = "spending_type"

    def __str__(self):
        return self.value
    

class SAVINGS_FUNDS_COLUMNS(Enum):
    ID = "savings_funds_id_pk"
    USER_ID = "user_id_fk"
    TARGET_AMOUNT = "target_amount"
    NAME = "fund_name"
    CREATED_AT = "created_at"

    def __str__(self):
        return self.value
    
class BUDGET_COLUMNS(Enum):
    ID_PK = "id_pk"
    USER_ID_FK = "user_id_fk"
    MONTH = "month"
    YEAR = "year"
    PLAN_JSON = "plan_json"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"

    def __str__(self):
        return self.value