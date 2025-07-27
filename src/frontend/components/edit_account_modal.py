import datetime
from dash import html, dcc
import dash_bootstrap_components as dbc
from utils.theme import COLORS, INPUT_STYLE, BUTTON_PRIMARY_STYLE, BUTTON_SECONDARY_STYLE


def create_edit_account_modal():
    """Modal dialog for editing or deleting an account."""
    modal = dbc.Modal(
        [
            dcc.Store(id="edit-account-id"),
            dbc.ModalHeader(dbc.ModalTitle("Edit Account")),
            dbc.ModalBody([
                html.Div([
                    html.Label("Name", htmlFor="edit-account-name-input", className="text-primary"),
                    dbc.Input(id="edit-account-name-input", type="text", placeholder="Account name", className="form-input mb-10"),
                ]),
                html.Div([
                    html.Label("Type", htmlFor="edit-account-type-input", className="text-primary"),
                    dbc.Input(id="edit-account-type-input", type="text", placeholder="Account type", className="form-input mb-10"),
                ]),
                html.Div([
                    html.Label("Starting Balance", htmlFor="edit-account-balance-input", className="text-primary"),
                    dbc.Input(id="edit-account-balance-input", type="number", placeholder="0", className="form-input mb-10"),
                ]),
                html.Div([
                    html.Label("Currency", htmlFor="edit-account-currency-input", className="text-primary"),
                    dbc.Input(id="edit-account-currency-input", type="text", placeholder="Currency", className="form-input mb-10"),
                ]),
            ]),
            dbc.ModalFooter([
                dbc.Button("Update", id="update-account-button", n_clicks=0, className="btn-primary width-120"),
                dbc.Button("Delete", id="delete-account-button", n_clicks=0, className="btn-danger width-120"),
                dbc.Button("Close", id="close-edit-account-modal", n_clicks=0, className="btn-secondary width-120"),
            ])
        ],
        id="edit-account-modal",
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
            'zIndex': 2000
        }
    )
