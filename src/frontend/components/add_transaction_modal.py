import datetime
from dash import html, dcc
import dash_bootstrap_components as dbc
from utils.theme import COLORS, INPUT_STYLE, BUTTON_PRIMARY_STYLE, BUTTON_SECONDARY_STYLE


def create_add_transaction_modal():
    """Modal dialog with form for adding a transaction."""
    today = datetime.date.today()
    modal = dbc.Modal(
        [
            dbc.ModalHeader(dbc.ModalTitle("Add Transaction")),
            dbc.ModalBody([
                html.Div([
                    html.Label("Account", htmlFor="transaction-account-dropdown", style={'color': COLORS['text_primary']}),
                    dcc.Dropdown(id="transaction-account-dropdown", options=[], placeholder="Select account", style={'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Category", htmlFor="transaction-category-dropdown", style={'color': COLORS['text_primary']}),
                    dcc.Dropdown(id="transaction-category-dropdown", options=[], placeholder="Select category", style={'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Amount", htmlFor="transaction-amount-input", style={'color': COLORS['text_primary']}),
                    dbc.Input(id="transaction-amount-input", type="number", placeholder="Amount", style={**INPUT_STYLE, 'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Date", htmlFor="transaction-date-input", style={'color': COLORS['text_primary']}),
                    dcc.DatePickerSingle(id="transaction-date-input", date=today, style={'marginBottom': '10px'})
                ]),
                html.Div([
                    html.Label("Notes", htmlFor="transaction-notes-input", style={'color': COLORS['text_primary']}),
                    dbc.Input(id="transaction-notes-input", type="text", placeholder="Optional notes", style={**INPUT_STYLE, 'marginBottom': '10px'})
                ]),
                dbc.Checkbox(id="transaction-transfer-checkbox", value=False, label="Transfer", style={'marginBottom': '10px'}),
            ]),
            dbc.ModalFooter([
                dbc.Button("Add", id="submit-transaction-button", n_clicks=0, style={**BUTTON_PRIMARY_STYLE, 'width': 'auto'}),
                dbc.Button("Close", id="close-add-transaction-modal", n_clicks=0, style={**BUTTON_SECONDARY_STYLE, 'width': 'auto'})
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
        style={
            'width': '100%',
            'marginTop': '65rem',
            'position': 'fixed',
            'zIndex': 2000  # Ensure it's above modal backdrop
        }
    )