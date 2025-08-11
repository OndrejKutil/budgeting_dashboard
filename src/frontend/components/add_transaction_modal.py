import datetime
from dash import html, dcc
import dash_bootstrap_components as dbc


def create_add_transaction_modal():
    """Modal dialog with form for adding a transaction."""
    today = datetime.date.today()
    modal = dbc.Modal(
        [
            dbc.ModalHeader(dbc.ModalTitle("Add Transaction")),
            dbc.ModalBody([
                html.Div([
                    html.Label("Account", htmlFor="transaction-account-dropdown", className="text-primary"),
                    dcc.Dropdown(id="transaction-account-dropdown", options=[], placeholder="Select account", className="mb-10")
                ]),
                html.Div([
                    html.Label("Category", htmlFor="transaction-category-dropdown", className="text-primary"),
                    dcc.Dropdown(id="transaction-category-dropdown", options=[], placeholder="Select category", className="mb-10")
                ]),
                html.Div([
                    html.Label("Amount", htmlFor="transaction-amount-input", className="text-primary"),
                    dbc.Input(id="transaction-amount-input", type="number", placeholder="Amount", className="form-input mb-10")
                ]),
                html.Div([
                    html.Label("Date", htmlFor="transaction-date-input", className="text-primary date-label"),
                    dcc.DatePickerSingle(id="transaction-date-input", date=today, className="mb-10")
                ]),
                html.Div([
                    html.Label("Notes", htmlFor="transaction-notes-input", className="text-primary"),
                    dbc.Input(id="transaction-notes-input", type="text", placeholder="Optional notes", className="form-input mb-10")
                ]),
                html.Div([
                    html.Label("Savings fund", htmlFor="transaction-savings-fund-dropdown", className="text-primary"),
                    dcc.Dropdown(id="transaction-savings-fund-dropdown", options=[], placeholder="Select savings fund", className="mb-10")
                ]),
            ]),
            dbc.ModalFooter([
                dbc.Button("Add", id="submit-transaction-button", n_clicks=0, className="btn-primary width-120"),
                dbc.Button("Close", id="close-add-transaction-modal", n_clicks=0, className="btn-secondary width-120")
            ])
        ],
        id="add-transaction-modal",
        is_open=False,
        backdrop=True,
        size="lg"
    )

    return dcc.Loading(
        modal,
        type="default",
        className="loading loading-modal-large"
    )