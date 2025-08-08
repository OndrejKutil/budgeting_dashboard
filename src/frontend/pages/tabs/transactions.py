from dash import html, dcc, Input, Output, State, callback, dash_table, dash
import dash_bootstrap_components as dbc

from helper.requests.transactions_request import (
    get_transactions,
    update_transaction as request_update_transaction,
    delete_transaction as request_delete_transaction,
    get_accounts,
    get_categories,
)
from components.edit_transaction_modal import create_edit_transaction_modal


LIMIT = 50

def _attach_names(items: list[dict], access_token: str, refresh_token: str) -> tuple[list[dict], str, str]:
    """
    Replace account_id and category_id in items with their names.
    
    Returns:
        Tuple of (updated_items, new_access_token, new_refresh_token)
    """
    try:
        accounts_resp, new_access_token, new_refresh_token = get_accounts(access_token, refresh_token)
        account_map = {
            acc.get("id"): acc.get("name", acc.get("id"))
            for acc in accounts_resp.get("data", [])
        }
    except Exception:
        account_map = {}
        new_access_token = access_token
        new_refresh_token = refresh_token

    try:
        categories_resp, new_access_token_2, new_refresh_token_2 = get_categories(new_access_token, new_refresh_token)
        category_map = {
            cat.get("id"): cat.get("name", cat.get("id"))
            for cat in categories_resp.get("data", [])
        }
        # Use the latest tokens from the categories request
        final_access_token = new_access_token_2
        final_refresh_token = new_refresh_token_2
    except Exception:
        category_map = {}
        final_access_token = new_access_token
        final_refresh_token = new_refresh_token

    for item in items:
        aid = item.get("account_id")
        cid = item.get("category_id")
        item["account_name"] = account_map.get(aid, aid)
        item["category_name"] = category_map.get(cid, cid)

    return items, final_access_token, final_refresh_token

def create_transactions_tab():
    """Create the transactions tab content"""

    return html.Div(
        id='transactions-tab-content',
        className='tab-content',
        children=[
            html.H2('Transactions', className='text-primary mb-20'),
            dcc.Store(id='transactions-offset-store', data={'offset': 0}),
            dcc.Store(id='transactions-refresh-store', data={'refresh': 0}),
            dbc.Row([
                dbc.Col(dbc.Button('Previous', id='transactions-prev-btn', color='secondary', className='me-2'), width='auto'),
                dbc.Col(dbc.Button('Next', id='transactions-next-btn', color='secondary'), width='auto'),
                dbc.Col(html.Div(id='transactions-page-info', className='align-self-center ml-10'), width='auto')
            ], className='mb-3'),
            dcc.Loading(
                dash_table.DataTable(
                id='transactions-table',
                data=[],
                columns=[
                    {'name': 'date', 'id': 'date'},
                    {'name': 'id', 'id': 'id'},
                    {'name': 'account', 'id': 'account_name'},
                    {'name': 'amount', 'id': 'amount'},
                    {'name': 'category', 'id': 'category_name'},
                    {'name': 'notes', 'id': 'notes'},
                    {'name': 'is_transfer', 'id': 'is_transfer'}
                ],
                hidden_columns=['id', 'is_transfer'],
                row_selectable='single',
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
                style_data_conditional=[
                    {
                        'if': {'column_id': 'amount', 'filter_query': '{amount} < 0'},
                        'color': 'var(--expense-color)',
                    },
                    {
                        'if': {'column_id': 'amount', 'filter_query': '{amount} >= 0'},
                        'color': 'var(--income-color)',
                    },
                ],
                page_action='none'
            ), className='loading'),
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
     Output('transactions-page-info', 'children'),
     Output('token-store', 'data', allow_duplicate=True)],
    [Input('navigation-store', 'data'),
     Input('transactions-offset-store', 'data'),
     Input('transactions-refresh-store', 'data')],
    State('token-store', 'data'),
    prevent_initial_call=True
)
def update_transactions(nav_data, offset_data, _refresh, token_store):
    if nav_data.get('active_tab') != 'transactions':
        return [], '', dash.no_update
    if not token_store or not token_store.get('access_token') or not token_store.get('refresh_token'):
        return [], '', dash.no_update

    offset = (offset_data or {}).get('offset', 0)
    try:
        # Use the new API client with token refresh capability
        data, new_access_token, new_refresh_token = get_transactions(
            token_store['access_token'],
            token_store['refresh_token'],
            offset=offset,
            limit=LIMIT
        )
        
        items = data.get('data', [])
        
        # Attach names with token refresh capability
        items, final_access_token, final_refresh_token = _attach_names(
            items,
            new_access_token,
            new_refresh_token
        )
        
        # Update token store if tokens were refreshed
        updated_token_store = token_store.copy()
        if (final_access_token != token_store['access_token'] or 
            final_refresh_token != token_store['refresh_token']):
            updated_token_store['access_token'] = final_access_token
            updated_token_store['refresh_token'] = final_refresh_token
            print("Tokens refreshed during transactions request")
        else:
            updated_token_store = dash.no_update
        
        info = f"Showing {offset + 1}-{offset + len(items)}"
        return items, info, updated_token_store
    except Exception as e:
        print(f"Error loading transactions: {e}")
        return [], 'Failed to load transactions', dash.no_update
    


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
        Output('token-store', 'data', allow_duplicate=True),
    ],
    Input('transactions-table', 'selected_rows'),
    State('transactions-table', 'data'),
    State('token-store', 'data'),
    prevent_initial_call=True,
)
def open_edit_transaction_modal(selected_rows, table_data, token_data):
    if not selected_rows or not token_data:
        return (dash.no_update, dash.no_update, dash.no_update, dash.no_update, 
                dash.no_update, dash.no_update, dash.no_update, dash.no_update, 
                dash.no_update, dash.no_update, dash.no_update)

    try:
        row = table_data[selected_rows[0]]
        
        # Use the new API client with token refresh capability
        accounts, new_access_token, new_refresh_token = get_accounts(
            token_data['access_token'],
            token_data['refresh_token']
        )
        
        categories, final_access_token, final_refresh_token = get_categories(
            new_access_token,
            new_refresh_token
        )
        
        # Update token store if tokens were refreshed
        updated_token_store = token_data.copy()
        if (final_access_token != token_data['access_token'] or 
            final_refresh_token != token_data['refresh_token']):
            updated_token_store['access_token'] = final_access_token
            updated_token_store['refresh_token'] = final_refresh_token
            print("Tokens refreshed during edit transaction modal open")
        else:
            updated_token_store = dash.no_update
        
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
            updated_token_store,
        )
        
    except Exception as e:
        print(f"Error opening edit transaction modal: {e}")
        return (dash.no_update, dash.no_update, dash.no_update, dash.no_update, 
                dash.no_update, dash.no_update, dash.no_update, dash.no_update, 
                dash.no_update, dash.no_update, dash.no_update)


@callback(
    [Output('edit-transaction-modal', 'is_open', allow_duplicate=True),
     Output('transactions-refresh-store', 'data', allow_duplicate=True),
     Output('token-store', 'data', allow_duplicate=True)],
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
        return dash.no_update, dash.no_update, dash.no_update

    try:
        payload = {
            'account_id': account_id,
            'category_id': category_id,
            'amount': amount,
            'date': date,
            'notes': notes,
            'is_transfer': bool(is_transfer),
        }
        
        # Use the new API client with token refresh capability
        response_data, new_access_token, new_refresh_token = request_update_transaction(
            token_data['access_token'],
            token_data['refresh_token'],
            trans_id,
            payload
        )
        
        # Update token store if tokens were refreshed
        updated_token_store = token_data.copy()
        if new_access_token != token_data['access_token'] or new_refresh_token != token_data['refresh_token']:
            updated_token_store['access_token'] = new_access_token
            updated_token_store['refresh_token'] = new_refresh_token
            print("Tokens refreshed during transaction update")
        else:
            updated_token_store = dash.no_update
            
        refresh_val = (refresh or {}).get('refresh', 0) + 1
        return False, {'refresh': refresh_val}, updated_token_store
        
    except Exception as e:
        print(f"Error updating transaction: {e}")
        return dash.no_update, dash.no_update, dash.no_update


@callback(
    [Output('edit-transaction-modal', 'is_open', allow_duplicate=True),
     Output('transactions-refresh-store', 'data', allow_duplicate=True),
     Output('token-store', 'data', allow_duplicate=True)],
    Input('delete-transaction-button', 'n_clicks'),
    State('edit-transaction-id', 'data'),
    State('token-store', 'data'),
    State('transactions-refresh-store', 'data'),
    prevent_initial_call=True,
)
def delete_transaction_cb(n_clicks, trans_id, token_data, refresh):
    if not n_clicks or not token_data or not trans_id:
        return dash.no_update, dash.no_update, dash.no_update

    try:
        # Use the new API client with token refresh capability
        response_data, new_access_token, new_refresh_token = request_delete_transaction(
            token_data['access_token'],
            token_data['refresh_token'],
            trans_id
        )
        
        # Update token store if tokens were refreshed
        updated_token_store = token_data.copy()
        if new_access_token != token_data['access_token'] or new_refresh_token != token_data['refresh_token']:
            updated_token_store['access_token'] = new_access_token
            updated_token_store['refresh_token'] = new_refresh_token
            print("Tokens refreshed during transaction deletion")
        else:
            updated_token_store = dash.no_update
            
        refresh_val = (refresh or {}).get('refresh', 0) + 1
        return False, {'refresh': refresh_val}, updated_token_store
        
    except Exception as e:
        print(f"Error deleting transaction: {e}")
        return dash.no_update, dash.no_update, dash.no_update


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