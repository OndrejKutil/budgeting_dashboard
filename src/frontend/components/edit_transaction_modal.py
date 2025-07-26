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
                    html.Label("Account", htmlFor="edit-transaction-account-dropdown", style={'color': COLORS['text_primary']}),
                    dcc.Dropdown(id="edit-transaction-account-dropdown", options=[], placeholder="Select account", style={'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Category", htmlFor="edit-transaction-category-dropdown", style={'color': COLORS['text_primary']}),
                    dcc.Dropdown(id="edit-transaction-category-dropdown", options=[], placeholder="Select category", style={'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Amount", htmlFor="edit-transaction-amount-input", style={'color': COLORS['text_primary']}),
                    dbc.Input(id="edit-transaction-amount-input", type="number", style={**INPUT_STYLE, 'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Date", htmlFor="edit-transaction-date-input", style={'color': COLORS['text_primary']}),
                    dcc.DatePickerSingle(id="edit-transaction-date-input", date=today, style={'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Notes", htmlFor="edit-transaction-notes-input", style={'color': COLORS['text_primary']}),
                    dbc.Input(id="edit-transaction-notes-input", type="text", style={**INPUT_STYLE, 'marginBottom': '10px'})
                ]),
                dbc.Checkbox(id="edit-transaction-transfer-checkbox", value=False, label="Transfer", style={'marginBottom': '10px'}),
            ]),
            dbc.ModalFooter([
                dbc.Button("Update", id="update-transaction-button", n_clicks=0, style={**BUTTON_PRIMARY_STYLE, 'width': 'auto'}),
                dbc.Button("Delete", id="delete-transaction-button", n_clicks=0, color="danger", className="ms-2"),
                dbc.Button("Close", id="close-edit-transaction-modal", n_clicks=0, style={**BUTTON_SECONDARY_STYLE, 'width': 'auto'}, className="ms-2")
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