import datetime
from dash import html, dcc
import dash_bootstrap_components as dbc


def create_add_account_modal():
    """Modal dialog with form for adding an account."""
    modal = dbc.Modal(
        [
            dbc.ModalHeader(dbc.ModalTitle("Add Account")),
            dbc.ModalBody([
                html.Div([
                    html.Label("Name", htmlFor="account-name-input", className="text-primary"),
                    dbc.Input(id="account-name-input", type="text", placeholder="Account name", className="form-input mb-10"),
                ]),
                html.Div([
                    html.Label("Type", htmlFor="account-type-input", className="text-primary"),
                    dbc.Input(id="account-type-input", type="text", placeholder="Account type", className="form-input mb-10"),
                ]),
                html.Div([
                    html.Label("Currency", htmlFor="account-currency-input", className="text-primary"),
                    dbc.Input(id="account-currency-input", type="text", placeholder="Currency", className="form-input mb-10"),
                ]),
            ]),
            dbc.ModalFooter([
                dbc.Button("Add", id="submit-account-button", n_clicks=0, className="btn-primary width-120"),
                dbc.Button("Close", id="close-add-account-modal", n_clicks=0, className="btn-secondary width-120"),
            ])
        ],
        id="add-account-modal",
        is_open=False,
        backdrop=True,
        size="lg",
    )

    return dcc.Loading(
        modal,
        type="default",
        className="loading loading-modal-large"
    )
