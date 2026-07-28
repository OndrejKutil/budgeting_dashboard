"""
Unit tests for the shared error-response helpers used by the global exception handlers.
"""

from helper.errors import flatten_validation_errors, generate_error_id

# ================================================================================================
#                                   flatten_validation_errors
# ================================================================================================

def test_flatten_single_field_error():
    errors = [{"loc": ("body", "amount"), "msg": "Input should be greater than 0"}]
    assert flatten_validation_errors(errors) == "amount: Input should be greater than 0"


def test_flatten_drops_leading_location_prefix():
    for prefix in ("body", "query", "path"):
        errors = [{"loc": (prefix, "email"), "msg": "Invalid email"}]
        assert flatten_validation_errors(errors) == "email: Invalid email"


def test_flatten_nested_location():
    errors = [{"loc": ("body", "plan", "categories", 0, "amount"), "msg": "Field required"}]
    assert flatten_validation_errors(errors) == "plan.categories.0.amount: Field required"


def test_flatten_multiple_errors_joined():
    errors = [
        {"loc": ("body", "amount"), "msg": "Field required"},
        {"loc": ("body", "date"), "msg": "Invalid date format"},
    ]
    assert flatten_validation_errors(errors) == "amount: Field required; date: Invalid date format"


def test_flatten_empty_location_falls_back_to_message_only():
    errors = [{"loc": (), "msg": "Invalid request body"}]
    assert flatten_validation_errors(errors) == "Invalid request body"


def test_flatten_empty_list():
    assert flatten_validation_errors([]) == "Invalid request."


def test_flatten_missing_msg_key():
    errors = [{"loc": ("body", "amount")}]
    assert flatten_validation_errors(errors) == "amount: Invalid value"


# ================================================================================================
#                                   generate_error_id
# ================================================================================================

def test_generate_error_id_not_empty():
    assert generate_error_id()


def test_generate_error_id_is_unique():
    ids = {generate_error_id() for _ in range(1000)}
    assert len(ids) == 1000
