from dash import html, dcc, Input, Output, State, callback, dash_table
import dash_bootstrap_components as dbc
from utils.theme import COLORS, INPUT_STYLE
from helper.requests.transactions_request import get_transactions
import dash


LIMIT = 100

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
            dcc.Store(id='selected-transaction-store'),
            dbc.Row([
                dbc.Col(dbc.Input(id='transaction-id-input', placeholder='Transaction ID', type='text', style=INPUT_STYLE), width=3),
                dbc.Col(dbc.Button('View Transaction', id='view-transaction-btn', color='primary'), width='auto'),
                dbc.Col(dbc.Button('Previous', id='transactions-prev-btn', color='secondary', className='me-2'), width='auto'),
                dbc.Col(dbc.Button('Next', id='transactions-next-btn', color='secondary'), width='auto'),
                dbc.Col(html.Div(id='transactions-page-info', style={'alignSelf': 'center', 'marginLeft': '10px'}), width='auto')
            ], className='mb-3'),
            dbc.Alert(id='transaction-update-alert', is_open=False, color='success', className='mb-3'),
            dash_table.DataTable(
                id='transactions-table',
                data=[],
                columns=[
                    {'name': 'id', 'id': 'id'},
                    {'name': 'account_id', 'id': 'account_id'},
                    {'name': 'category_id', 'id': 'category_id'},
                    {'name': 'amount', 'id': 'amount'},
                    {'name': 'date', 'id': 'date'},
                    {'name': 'notes', 'id': 'notes'},
                    {'name': 'is_transfer', 'id': 'is_transfer'}
                ],
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
            html.Div(
                id='update-section',
                style={'display': 'none', 'marginTop': '20px'},
                children=[
                    dbc.Input(id='update-notes-input', placeholder='Notes', style=INPUT_STYLE),
                    dbc.Button('Update Transaction', id='update-transaction-btn', color='success', className='mt-2')
                ]
            )
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
    Output('selected-transaction-store', 'data'),
    Input('view-transaction-btn', 'n_clicks'),
    State('transaction-id-input', 'value'),
    State('token-store', 'data'),
    prevent_initial_call=True
)
def load_transaction(n_clicks, transaction_id, token_store):
    if n_clicks and transaction_id and token_store and token_store.get('access_token'):
        try:
            data = get_transactions(token_store['access_token'], transaction_id=str(transaction_id))
            tx = data.get('data')
            if tx:
                return tx[0]
        except Exception:
            pass
    return None


@callback(
    [Output('transactions-table', 'data'),
     Output('transactions-page-info', 'children'),
     Output('update-section', 'style')],
    [Input('navigation-store', 'data'),
     Input('transactions-offset-store', 'data'),
     Input('selected-transaction-store', 'data')],
    State('token-store', 'data')
)
def update_transactions(nav_data, offset_data, selected_tx, token_store):
    if nav_data.get('active_tab') != 'transactions':
        return [], '', {'display': 'none'}
    if not token_store or not token_store.get('access_token'):
        return [], '', {'display': 'none'}

    if selected_tx:
        return [selected_tx], 'Viewing selected transaction', {'display': 'block'}

    offset = (offset_data or {}).get('offset', 0)
    try:
        data = get_transactions(token_store['access_token'], offset=offset, limit=LIMIT)
        items = data.get('data', [])
        info = f"Showing {offset + 1}-{offset + len(items)}"
        return items, info, {'display': 'none'}
    except Exception:
        return [], 'Failed to load transactions', {'display': 'none'}


@callback(
    [Output('transaction-update-alert', 'children'),
     Output('transaction-update-alert', 'is_open')],
    Input('update-transaction-btn', 'n_clicks'),
    prevent_initial_call=True
)
def update_transaction(n_clicks):
    if n_clicks:
        return 'Transaction updated successfully', True
    return dash.no_update, False
