from enum import Enum

""" 
Definition of columns used in the database.
"""

class COLUMNS(Enum):
    
    DATE = "date"
    CATEGORY = "category"
    DESCRIPTION = "description"
    ACCOUNT = "account"

    def __str__(self):
        return self.value