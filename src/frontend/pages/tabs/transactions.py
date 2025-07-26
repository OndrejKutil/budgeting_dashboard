from dash import html, dcc, Input, Output, State, callback, dash_table
import dash_bootstrap_components as dbc
from utils.theme import COLORS, INPUT_STYLE
from helper.requests.transactions_request import (
    get_transactions,
    update_transaction as request_update_transaction,
    delete_transaction as request_delete_transaction,
)
from components.edit_transaction_modal import create_edit_transaction_modal
from helper.requests.accounts_request import get_accounts
from helper.requests.categories_request import get_categories
import dash


LIMIT = 100

def _attach_names(items: list[dict], access_token: str) -> list[dict]:
    """Replace account_id and category_id in items with their names."""
    try:
        accounts_resp = get_accounts(access_token)
        account_map = {
            acc.get("id"): acc.get("name", acc.get("id"))
            for acc in accounts_resp.get("data", [])
        }
    except Exception:
        account_map = {}

    try:
        categories_resp = get_categories(access_token)
        category_map = {
            cat.get("id"): cat.get("name", cat.get("id"))
            for cat in categories_resp.get("data", [])
        }
    except Exception:
        category_map = {}

    for item in items:
        aid = item.get("account_id")
        cid = item.get("category_id")
        item["account_name"] = account_map.get(aid, aid)
        item["category_name"] = category_map.get(cid, cid)

    return items

def create_transactions_tab():
    """Create the transactions tab content"""

    content_style = {
        'backgroundColor': COLORS['background_primary'],
        'padding': '24px',
        'margin': '0',
        'minHeight': '100%',
        'width': '100%'
    }

    return html.Div(
        id='transactions-tab-content',
        style=content_style,
        children=[
            html.H2('Transactions', style={'color': COLORS['text_primary'], 'marginBottom': '20px'}),
            dcc.Store(id='transactions-offset-store', data={'offset': 0}),
            dcc.Store(id='transactions-refresh-store', data={'refresh': 0}),
            dbc.Row([
                dbc.Col(dbc.Button('Previous', id='transactions-prev-btn', color='secondary', className='me-2'), width='auto'),
                dbc.Col(dbc.Button('Next', id='transactions-next-btn', color='secondary'), width='auto'),
                dbc.Col(html.Div(id='transactions-page-info', style={'alignSelf': 'center', 'marginLeft': '10px'}), width='auto')
            ], className='mb-3'),
            dash_table.DataTable(
                id='transactions-table',
                data=[],
                columns=[
                    {'name': 'id', 'id': 'id'},
                    {'name': 'account', 'id': 'account_name'},
                    {'name': 'category', 'id': 'category_name'},
                    {'name': 'amount', 'id': 'amount'},
                    {'name': 'date', 'id': 'date'},
                    {'name': 'notes', 'id': 'notes'},
                    {'name': 'is_transfer', 'id': 'is_transfer'}
                ],
                row_selectable='single',
                style_cell={
                    'textAlign': 'left',
                    'backgroundColor': COLORS['background_secondary'],
                    'color': COLORS['text_primary'],
                    'border': f'1px solid {COLORS["text_secondary"]}',
                    'padding': '8px'
                },
                style_header={
                    'backgroundColor': COLORS['text_secondary'],
                    'color': COLORS['background_primary'],
                    'fontWeight': 'bold'
                },
                page_action='none'
            ),
            create_edit_transaction_modal()
        ]
    )


@callback(
    Output('transactions-offset-store', 'data', allow_duplicate=True),
    Input('transactions-prev-btn', 'n_clicks'),
    State('transactions-offset-store', 'data'),
    prevent_initial_call=True
)
def prev_page(n_clicks, data):
    if n_clicks is None:
        return dash.no_update
    offset = max(0, (data or {}).get('offset', 0) - LIMIT)
    return {'offset': offset}


@callback(
    Output('transactions-offset-store', 'data', allow_duplicate=True),
    Input('transactions-next-btn', 'n_clicks'),
    State('transactions-offset-store', 'data'),
    prevent_initial_call=True
)
def next_page(n_clicks, data):
    if n_clicks is None:
        return dash.no_update
    offset = (data or {}).get('offset', 0) + LIMIT
    return {'offset': offset}




@callback(
    [Output('transactions-table', 'data'),
     Output('transactions-page-info', 'children')],
    [Input('navigation-store', 'data'),
     Input('transactions-offset-store', 'data'),
     Input('transactions-refresh-store', 'data')],
    State('token-store', 'data')
)
def update_transactions(nav_data, offset_data, _refresh, token_store):
    if nav_data.get('active_tab') != 'transactions':
        return [], ''
    if not token_store or not token_store.get('access_token'):
        return [], ''

    offset = (offset_data or {}).get('offset', 0)
    try:
        data = get_transactions(token_store['access_token'], offset=offset, limit=LIMIT)
        items = data.get('data', [])
        items = _attach_names(items, token_store['access_token'])
        info = f"Showing {offset + 1}-{offset + len(items)}"
        return items, info
    except Exception:
        return [], 'Failed to load transactions'
    


@callback(
    [
        Output('edit-transaction-modal', 'is_open'),
        Output('edit-transaction-id', 'data'),
        Output('edit-transaction-account-dropdown', 'options'),
        Output('edit-transaction-category-dropdown', 'options'),
        Output('edit-transaction-account-dropdown', 'value'),
        Output('edit-transaction-category-dropdown', 'value'),
        Output('edit-transaction-amount-input', 'value'),
        Output('edit-transaction-date-input', 'date'),
        Output('edit-transaction-notes-input', 'value'),
        Output('edit-transaction-transfer-checkbox', 'value'),
    ],
    Input('transactions-table', 'selected_rows'),
    State('transactions-table', 'data'),
    State('token-store', 'data'),
    prevent_initial_call=True,
)
def open_edit_transaction_modal(selected_rows, table_data, token_data):
    if not selected_rows or not token_data:
        return dash.no_update, dash.no_update, dash.no_update, dash.no_update, dash.no_update, dash.no_update, dash.no_update, dash.no_update, dash.no_update, dash.no_update

    row = table_data[selected_rows[0]]
    accounts = get_accounts(token_data['access_token'])
    categories = get_categories(token_data['access_token'])
    acc_options = [
        {"label": a.get("name"), "value": a.get("id")}
        for a in accounts.get("data", [])
    ]
    cat_options = [
        {"label": c.get("name"), "value": c.get("id")}
        for c in categories.get("data", [])
    ]

    return (
        True,
        row.get('id'),
        acc_options,
        cat_options,
        row.get('account_id'),
        row.get('category_id'),
        row.get('amount'),
        row.get('date'),
        row.get('notes'),
        row.get('is_transfer'),
    )


@callback(
    Output('edit-transaction-modal', 'is_open', allow_duplicate=True),
    Output('transactions-refresh-store', 'data', allow_duplicate=True),
    Input('update-transaction-button', 'n_clicks'),
    State('edit-transaction-id', 'data'),
    State('edit-transaction-account-dropdown', 'value'),
    State('edit-transaction-category-dropdown', 'value'),
    State('edit-transaction-amount-input', 'value'),
    State('edit-transaction-date-input', 'date'),
    State('edit-transaction-notes-input', 'value'),
    State('edit-transaction-transfer-checkbox', 'value'),
    State('token-store', 'data'),
    State('transactions-refresh-store', 'data'),
    prevent_initial_call=True,
)
def update_transaction_cb(_, trans_id, account_id, category_id, amount, date, notes, is_transfer, token_data, refresh):
    if not _ or not token_data or not trans_id:
        return dash.no_update, dash.no_update

    payload = {
        'account_id': account_id,
        'category_id': category_id,
        'amount': amount,
        'date': date,
        'notes': notes,
        'is_transfer': bool(is_transfer),
    }
    request_update_transaction(token_data['access_token'], trans_id, payload)
    refresh_val = (refresh or {}).get('refresh', 0) + 1
    return False, {'refresh': refresh_val}


@callback(
    Output('edit-transaction-modal', 'is_open', allow_duplicate=True),
    Output('transactions-refresh-store', 'data', allow_duplicate=True),
    Input('delete-transaction-button', 'n_clicks'),
    State('edit-transaction-id', 'data'),
    State('token-store', 'data'),
    State('transactions-refresh-store', 'data'),
    prevent_initial_call=True,
)
def delete_transaction_cb(n_clicks, trans_id, token_data, refresh):
    if not n_clicks or not token_data or not trans_id:
        return dash.no_update, dash.no_update

    request_delete_transaction(token_data['access_token'], trans_id)
    refresh_val = (refresh or {}).get('refresh', 0) + 1
    return False, {'refresh': refresh_val}


@callback(
    Output('edit-transaction-modal', 'is_open', allow_duplicate=True),
    Input('close-edit-transaction-modal', 'n_clicks'),
    State('edit-transaction-modal', 'is_open'),
    prevent_initial_call=True,
)
def close_edit_transaction_modal(n_clicks, is_open):
    if n_clicks:
        return False
    return is_open