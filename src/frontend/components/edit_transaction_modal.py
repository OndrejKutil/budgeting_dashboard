import datetime
from dash import html, dcc
import dash_bootstrap_components as dbc
from utils.theme import COLORS, INPUT_STYLE, BUTTON_PRIMARY_STYLE, BUTTON_SECONDARY_STYLE


def create_edit_transaction_modal():
    """Modal dialog for editing or deleting a transaction."""
    today = datetime.date.today()
    modal = dbc.Modal(
        [
            dcc.Store(id="edit-transaction-id"),
            dbc.ModalHeader(dbc.ModalTitle("Edit Transaction")),
            dbc.ModalBody([
                html.Div([
                    html.Label("Account", htmlFor="edit-transaction-account-dropdown", className="text-primary"),
                    dcc.Dropdown(id="edit-transaction-account-dropdown", options=[], placeholder="Select account", style={'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Category", htmlFor="edit-transaction-category-dropdown", className="text-primary"),
                    dcc.Dropdown(id="edit-transaction-category-dropdown", options=[], placeholder="Select category", style={'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Amount", htmlFor="edit-transaction-amount-input", className="text-primary"),
                    dbc.Input(id="edit-transaction-amount-input", type="number", className="form-input mb-10", placeholder="Enter amount")
                ]),
                html.Div([
                    html.Label("Date", htmlFor="edit-transaction-date-input", className="text-primary date-label"),
                    dcc.DatePickerSingle(id="edit-transaction-date-input", date=today, className="mb-10")
                ]),
                html.Div([
                    html.Label("Notes", htmlFor="edit-transaction-notes-input", className="text-primary"),
                    dbc.Input(id="edit-transaction-notes-input", type="text", className="form-input mb-10", placeholder="Optional notes")
                ]),
                dbc.Checkbox(id="edit-transaction-transfer-checkbox", value=False, label="Transfer", className="mb-10"),
            ]),
            dbc.ModalFooter([
                dbc.Button("Update", id="update-transaction-button", n_clicks=0, className="btn-primary width-120"),
                dbc.Button("Delete", id="delete-transaction-button", n_clicks=0, className="btn-danger width-120"),
                dbc.Button("Close", id="close-edit-transaction-modal", n_clicks=0, className="btn-secondary width-120")
            ])
        ],
        id="edit-transaction-modal",
        is_open=False,
        backdrop=True,
        size="lg",
    )

    return dcc.Loading(
        modal,
        type="default",
        style={
            'width': '100%',
            'marginTop': '30rem',
            'position': 'fixed',
            'zIndex': 2000  # Ensure it's above modal backdrop
        }
    )