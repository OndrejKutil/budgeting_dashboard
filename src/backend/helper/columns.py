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
    IS_ACTIVE = "account_is_active"
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
    USER_ID = "user_id_fk"

    def __str__(self):
        return self.value
    

class SAVINGS_FUNDS_COLUMNS(Enum):
    ID = "savings_funds_id_pk"
    USER_ID = "user_id_fk"
    TARGET_AMOUNT = "target_amount"
    NAME = "fund_name"
    IS_ACTIVE = "fund_is_active"
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


class RECURRING_COLUMNS(Enum):
    ID = "recurring_id_pk"
    USER_ID = "user_id_fk"
    ACCOUNT_ID = "account_id_fk"
    CATEGORY_ID = "category_id_fk"
    SAVINGS_FUND_ID = "savings_fund_id_fk"
    AMOUNT = "amount"
    CADENCE = "cadence"
    NEXT_DATE = "next_date"
    NOTES = "notes"
    IS_ACTIVE = "is_active"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"

    def __str__(self):
        return self.value


class DIVIDEND_PORTFOLIO_COLUMNS(Enum):
    ID_PK = "id_pk"
    USER_ID_FK = "user_id_fk"
    PORTFOLIO_VALUE = "portfolio_value"
    PORTFOLIO_JSON = "portfolio_json"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"

    def __str__(self):
        return self.value


class TAGS_COLUMNS(Enum):
    ID = "tags_id_pk"
    USER_ID = "user_id_fk"
    NAME = "tag_name"
    CREATED_AT = "created_at"

    def __str__(self):
        return self.value


class TRANSACTION_TAGS_COLUMNS(Enum):
    TRANSACTION_ID = "transaction_id_fk"
    TAG_ID = "tag_id_fk"
    USER_ID = "user_id_fk"

    def __str__(self):
        return self.value


class FEATURES_COLUMNS(Enum):
    ID = "features_id_pk"
    KEY = "feature_key"
    NAME = "feature_name"
    DESCRIPTION = "feature_description"
    IS_ACTIVE = "is_active"
    CREATED_AT = "created_at"

    def __str__(self):
        return self.value


class FEATURES_USERS_COLUMNS(Enum):
    ID = "features_users_id_pk"
    USER_ID = "user_id_fk"
    KEY = "feature_key"
    IS_ENABLED = "is_enabled"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"

    def __str__(self):
        return self.value


class T212_CONNECTIONS_COLUMNS(Enum):
    ID_PK = "id_pk"
    USER_ID_FK = "user_id_fk"
    ENCRYPTED_CREDENTIALS = "encrypted_credentials"
    ACCOUNT_CURRENCY = "account_currency"
    LAST_SYNCED_AT = "last_synced_at"
    LAST_SYNC_STATUS = "last_sync_status"
    CREATED_AT = "created_at"
    UPDATED_AT = "updated_at"

    def __str__(self):
        return self.value


class T212_POSITIONS_COLUMNS(Enum):
    ID_PK = "id_pk"
    USER_ID_FK = "user_id_fk"
    TICKER = "ticker"
    QUANTITY = "quantity"
    AVERAGE_PRICE = "average_price"
    CURRENT_PRICE = "current_price"
    MARKET_VALUE = "market_value"
    PPL = "ppl"
    SYNCED_AT = "synced_at"

    def __str__(self):
        return self.value


class T212_VALUE_HISTORY_COLUMNS(Enum):
    ID_PK = "id_pk"
    USER_ID_FK = "user_id_fk"
    TOTAL_VALUE = "total_value"
    SNAPSHOT_AT = "snapshot_at"
    CREATED_AT = "created_at"

    def __str__(self):
        return self.value