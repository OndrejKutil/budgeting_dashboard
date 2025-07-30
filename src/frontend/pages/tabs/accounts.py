from dash import html, dcc, Input, Output, State, callback, dash_table, callback_context
import dash_bootstrap_components as dbc
from helper.requests.accounts_request import (
    get_accounts,
    update_account as request_update_account,
    delete_account as request_delete_account,
)
from helper.requests.accounts_request import create_account
from components.add_transaction_modal import create_add_transaction_modal
from components.add_account_modal import create_add_account_modal
from components.edit_account_modal import create_edit_account_modal
import dash
import datetime

LIMIT = 50

def create_accounts_tab():
    """Create the accounts tab content"""

    return html.Div(
        id='accounts-tab-content',
        className='tab-content',
        children=[
            # Modals
            create_add_transaction_modal(),
            create_add_account_modal(),
            create_edit_account_modal(),
            
            # Header section with title and actions
            html.Div([
                html.H2('Accounts', className='text-primary'),
                html.Button(
                    "Add Account",
                    id="open-add-account-button",
                    className='add-account-button'
                )
            ], className='page-header mb-20'),
            
            # Data stores
            dcc.Store(id='accounts-offset-store', data={'offset': 0}),
            dcc.Store(id='accounts-refresh-store', data={'refresh': 0}),
            
            # Pagination controls
            dbc.Row([
                dbc.Col(dbc.Button('Previous', id='accounts-prev-btn', color='secondary', className='me-2'), width='auto'),
                dbc.Col(dbc.Button('Next', id='accounts-next-btn', color='secondary'), width='auto'),
                dbc.Col(html.Div(id='accounts-page-info', className='align-self-center ml-10 mt-2'), width='auto'),
            ], className='mb-3'),
            dcc.Loading(
                dash_table.DataTable(
                id='accounts-table',
                data=[],
                columns=[
                    {'name': 'id', 'id': 'id'},
                    {'name': 'name', 'id': 'name'},
                    {'name': 'type', 'id': 'type'},
                    {'name': 'currency', 'id': 'currency'},
                    {'name': 'created_at', 'id': 'created_at'}
                ],
                hidden_columns=['id'],
                row_selectable='single',
                sort_action='native',
                style_cell={
                    'textAlign': 'left',
                    'backgroundColor': 'var(--background-secondary)',
                    'color': 'var(--text-primary)',
                    'border': '1px solid var(--text-secondary)',
                    'padding': '8px'
                },
                style_header={
                    'backgroundColor': 'var(--text-secondary)',
                    'color': 'var(--background-primary)',
                    'fontWeight': 'bold'
                },
                page_action='none'
            ), className='loading'),
        ]
    )


@callback(
    Output('accounts-offset-store', 'data', allow_duplicate=True),
    Input('accounts-prev-btn', 'n_clicks'),
    State('accounts-offset-store', 'data'),
    prevent_initial_call=True
)
def prev_page(n_clicks, data):
    if n_clicks is None:
        return dash.no_update
    offset = max(0, (data or {}).get('offset', 0) - LIMIT)
    return {'offset': offset}


@callback(
    Output('accounts-offset-store', 'data', allow_duplicate=True),
    Input('accounts-next-btn', 'n_clicks'),
    State('accounts-offset-store', 'data'),
    prevent_initial_call=True
)
def next_page(n_clicks, data):
    if n_clicks is None:
        return dash.no_update
    offset = (data or {}).get('offset', 0) + LIMIT
    return {'offset': offset}


@callback(
    [Output('accounts-table', 'data'),
     Output('accounts-page-info', 'children')],
    [Input('navigation-store', 'data'),
     Input('accounts-offset-store', 'data'),
     Input('accounts-refresh-store', 'data')],
    State('token-store', 'data')
)
def update_accounts(nav_data, offset_data, _refresh, token_store):
    if nav_data.get('active_tab') != 'accounts':
        return [], ''
    if not token_store or not token_store.get('access_token'):
        return [], ''

    offset = (offset_data or {}).get('offset', 0)
    try:
        data = get_accounts(token_store['access_token'])
        items = data.get('data', [])
        sliced = items[offset: offset + LIMIT]
        info = f"Showing {offset + 1}-{offset + len(sliced)}"
        return sliced, info
    except Exception:
        return [], 'Failed to load accounts'


@callback(
    [
        Output('edit-account-modal', 'is_open'),
        Output('edit-account-id', 'data'),
        Output('edit-account-name-input', 'value'),
        Output('edit-account-type-input', 'value'),
        Output('edit-account-currency-input', 'value'),
    ],
    Input('accounts-table', 'selected_rows'),
    State('accounts-table', 'data'),
    prevent_initial_call=True,
)
def open_edit_account_modal(selected_rows, table_data):
    if not selected_rows:
        return dash.no_update, dash.no_update, dash.no_update, dash.no_update

    row = table_data[selected_rows[0]]

    return (
        True,
        row.get('id'),
        row.get('name'),
        row.get('type'),
        row.get('currency'),
    )


@callback(
    Output('edit-account-modal', 'is_open', allow_duplicate=True),
    Output('accounts-refresh-store', 'data', allow_duplicate=True),
    Input('update-account-button', 'n_clicks'),
    State('edit-account-id', 'data'),
    State('edit-account-name-input', 'value'),
    State('edit-account-type-input', 'value'),
    State('edit-account-balance-input', 'value'),
    State('token-store', 'data'),
    State('accounts-refresh-store', 'data'),
    prevent_initial_call=True,
)
def update_account_cb(_, acc_id, name, acc_type, currency, token_data, refresh):
    if not _ or not token_data or not acc_id:
        return dash.no_update, dash.no_update

    payload = {
        'name': name,
        'type': acc_type,
        'currency': currency,
    }
    request_update_account(token_data['access_token'], acc_id, payload)
    refresh_val = (refresh or {}).get('refresh', 0) + 1
    return False, {'refresh': refresh_val}


@callback(
    Output('edit-account-modal', 'is_open', allow_duplicate=True),
    Output('accounts-refresh-store', 'data', allow_duplicate=True),
    Input('delete-account-button', 'n_clicks'),
    State('edit-account-id', 'data'),
    State('token-store', 'data'),
    State('accounts-refresh-store', 'data'),
    prevent_initial_call=True,
)
def delete_account_cb(n_clicks, acc_id, token_data, refresh):
    if not n_clicks or not token_data or not acc_id:
        return dash.no_update, dash.no_update

    request_delete_account(token_data['access_token'], acc_id)
    refresh_val = (refresh or {}).get('refresh', 0) + 1
    return False, {'refresh': refresh_val}


@callback(
    Output('edit-account-modal', 'is_open', allow_duplicate=True),
    Input('close-edit-account-modal', 'n_clicks'),
    State('edit-account-modal', 'is_open'),
    prevent_initial_call=True,
)
def close_edit_account_modal(n_clicks, is_open):
    if n_clicks:
        return False
    return is_open

@callback(
    Output("add-account-modal", "is_open"),
    Input("open-add-account-button", "n_clicks"),
    Input("close-add-account-modal", "n_clicks"),
    State("add-account-modal", "is_open"),
    prevent_initial_call=True,
)
def toggle_add_account_modal(open_click, close_click, is_open):
    ctx = callback_context
    if ctx.triggered_id == "open-add-account-button":
        return True
    if ctx.triggered_id == "close-add-account-modal":
        return False
    return is_open


@callback(
    Output("add-account-modal", "is_open", allow_duplicate=True),
    Input("submit-account-button", "n_clicks"),
    State("account-name-input", "value"),
    State("account-type-input", "value"),
    State("account-currency-input", "value"),
    State("token-store", "data"),
    prevent_initial_call=True,
)
def submit_account(_, name, acc_type, currency, token_data):
    if not token_data:
        return dash.no_update

    payload = {
        "name": name,
        "type": acc_type,
        "currency": currency,
        "created_at": datetime.datetime.now().isoformat(),
    }
    create_account(token_data.get("access_token", ""), payload)
    return False