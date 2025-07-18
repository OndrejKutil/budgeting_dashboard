import re
from typing import Dict, List, Tuple


# =============================================================================
# Validation Functions
# =============================================================================

def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email address format.
    
    Args:
        email (str): Email address to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not email:
        return False, "Email address is required"
    
    if len(email) > 254:
        return False, "Email address is too long"
    
    # Basic email regex pattern
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    
    if not re.match(email_pattern, email):
        return False, "Please enter a valid email address"
    
    return True, ""


def validate_password(password: str) -> Tuple[bool, List[str]]:
    """
    Validate password based on security requirements.
    
    Requirements:
    - At least 8 characters
    - At least 1 uppercase letter
    - At least 1 lowercase letter
    - At least 1 number
    
    Args:
        password (str): Password to validate
        
    Returns:
        Tuple[bool, List[str]]: (is_valid, list_of_error_messages)
    """
    errors = []
    
    if not password:
        return False, ["Password is required"]
    
    # Check password length
    if len(password) < 8:
        errors.append("Password must be at least 8 characters long")
    
    # Check if password contains uppercase character
    if not re.search(r'[A-Z]', password):
        errors.append("Password must contain at least one uppercase letter")
    
    # Check if password contains lowercase character
    if not re.search(r'[a-z]', password):
        errors.append("Password must contain at least one lowercase letter")
    
    # Check if password contains number
    if not re.search(r'\d', password):
        errors.append("Password must contain at least one number")
    
    return len(errors) == 0, errors


def validate_password_confirmation(password: str, confirm_password: str) -> Tuple[bool, str]:
    """
    Validate that password and confirmation password match.
    
    Args:
        password (str): Original password
        confirm_password (str): Confirmation password
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    if not confirm_password:
        return False, "Please confirm your password"
    
    if password != confirm_password:
        return False, "Passwords do not match"
    
    return True, ""


def validate_full_name(full_name: str) -> Tuple[bool, str]:
    """
    Validate full name (optional field).
    
    Args:
        full_name (str): Full name to validate
        
    Returns:
        Tuple[bool, str]: (is_valid, error_message)
    """
    # Full name is optional, so empty is valid
    if not full_name:
        return True, ""
    
    if len(full_name.strip()) < 2:
        return False, "Full name must be at least 2 characters"
    
    if len(full_name) > 100:
        return False, "Full name is too long"
    
    # Check for valid characters (letters, spaces, hyphens, apostrophes)
    name_pattern = r"^[a-zA-Z\s\-']+$"
    if not re.match(name_pattern, full_name):
        return False, "Full name can only contain letters, spaces, hyphens, and apostrophes"
    
    return True, ""


def validate_registration_form(email: str, full_name: str, password: str, confirm_password: str) -> Dict[str, List[str]]:
    """
    Validate entire registration form and return all errors.
    
    Args:
        email (str): Email address
        full_name (str): Full name (optional)
        password (str): Password
        confirm_password (str): Password confirmation
        
    Returns:
        Dict[str, List[str]]: Dictionary with field names as keys and lists of error messages as values
    """
    errors = {}
    
    # Validate email
    email_valid, email_error = validate_email(email)
    if not email_valid:
        errors['email'] = [email_error]
    
    # Validate full name
    name_valid, name_error = validate_full_name(full_name)
    if not name_valid:
        errors['full_name'] = [name_error]
    
    # Validate password
    password_valid, password_errors = validate_password(password)
    if not password_valid:
        errors['password'] = password_errors
    
    # Validate password confirmation
    confirm_valid, confirm_error = validate_password_confirmation(password, confirm_password)
    if not confirm_valid:
        errors['confirm_password'] = [confirm_error]
    
    return errors
