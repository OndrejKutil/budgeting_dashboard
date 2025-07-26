from dash import html, dcc, Input, Output, State, callback, dash_table
import dash_bootstrap_components as dbc
from utils.theme import COLORS, INPUT_STYLE
from helper.requests.transactions_request import get_transactions
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
        if aid in account_map:
            item["account_id"] = account_map[aid]
        if cid in category_map:
            item["category_id"] = category_map[cid]

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
                    {'name': 'account', 'id': 'account_id'},
                    {'name': 'category', 'id': 'category_id'},
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
    [Output('transactions-table', 'data'),
     Output('transactions-page-info', 'children')],
    [Input('navigation-store', 'data'),
     Input('transactions-offset-store', 'data')],
    State('token-store', 'data')
)
def update_transactions(nav_data, offset_data, token_store):
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